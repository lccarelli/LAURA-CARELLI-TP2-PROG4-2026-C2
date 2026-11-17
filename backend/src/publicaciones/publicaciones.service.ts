import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import { Usuario } from '../usuarios/schemas/usuario.schema.js';
import { Destino } from '../imagenes/destinos.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import type { ArchivosPublicacion } from './archivos-publicacion.pipe.js';
import { EventosMeGustaService } from './eventos-me-gusta.service.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { EditarPublicacionDto } from './dto/editar-publicacion.dto.js';
import { MAXIMO_FOTOS_POR_PASO } from '../imagenes/imagenes.constantes.js';
import type { PasoDto, PasoEdicionDto } from './dto/paso.dto.js';
import { filtroDeBusqueda } from '../common/busqueda.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { MeGusta } from './schemas/me-gusta.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';

type PublicacionConId = { _id: Types.ObjectId };

type PublicacionEditable = {
  usuario: Types.ObjectId;
  tipo: string;
  pasos?: { imagenes?: string[] }[];
};

type Listado = {
  datos: PublicacionConId[];
  offset: number;
  limit: number;
  hayMas: boolean;
};

type Solicitante = { id: string; perfil: string };

type PublicacionConAutor = {
  _id: Types.ObjectId;
  titulo: string;
  usuario: { _id: Types.ObjectId; nombreUsuario: string };
};

const ORDENES = {
  fecha: { fecha: -1, _id: -1 },
  megusta: { cantidadMeGusta: -1, fecha: -1, _id: -1 },
} as const;

const CODIGO_CLAVE_DUPLICADA = 11000;

const esClaveDuplicada = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === CODIGO_CLAVE_DUPLICADA;

const CAMPOS_AUTOR = 'nombre apellido nombreUsuario imagenPerfil';

@Injectable()
export class PublicacionesService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(MeGusta.name)
    private readonly meGustaModel: Model<MeGusta>,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<Usuario>,
    private readonly eventos: EventosMeGustaService,
    private readonly notificaciones: NotificacionesService,
    private readonly imagenesService: ImagenesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(PublicacionesService.name);
  }

  async crear(
    usuarioId: string,
    dto: CrearPublicacionDto,
    archivos?: ArchivosPublicacion,
  ) {
    const imagen = archivos?.imagen?.[0];
    const fotosPasos = archivos?.imagenesPasos ?? [];
    this.validarFotosDePasos(dto.pasos, fotosPasos.length);

    const urlImagen = imagen
      ? (
          await this.imagenesService.guardar(
            imagen,
            Destino.PUBLICACIONES,
            usuarioId,
            dto.tipo,
          )
        ).url
      : undefined;

    const pasos = dto.pasos
      ? await this.subirFotosDePasos(dto.pasos, dto.tipo, fotosPasos, usuarioId)
      : undefined;

    const creada = await this.publicacionModel.create({
      usuario: usuarioId,
      tipo: dto.tipo,
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      ingredientes: dto.ingredientes,
      pasos,
      porciones: dto.porciones,
      tipoRinde: dto.tipoRinde,
      tiempoMinutos: dto.tiempoMinutos,
      costo: dto.costo,
      calorias: dto.calorias,
      imagen: urlImagen,
    });
    await this.cache.clear();
    await creada.populate('usuario', CAMPOS_AUTOR);
    this.logger.info(EVENTOS_DE_LOG.PUBLICACION_CREADA, 'Publicación creada', {
      id_publicacion: creada.id,
      id_usuario: usuarioId,
      nombre_usuario: (creada.usuario as unknown as { nombreUsuario: string })
        .nombreUsuario,
      tipo: creada.tipo,
    });
    return creada.toObject();
  }

  private validarFotosDePasos(pasos: PasoDto[] | undefined, cantidad: number) {
    const usadas = (pasos ?? []).flatMap(({ fotos }) => fotos ?? []);
    const repetida = new Set(usadas).size !== usadas.length;
    if (repetida || usadas.some((foto) => foto >= cantidad)) {
      throw this.fotoDePasoInvalida(
        'Las fotos de los pasos no coinciden con los archivos enviados',
      );
    }
  }

  private fotoDePasoInvalida(message: string) {
    return new BadRequestException({
      message,
      codigo: 'FOTO_DE_PASO_INVALIDA',
    });
  }

  private subirFotosDePasos(
    pasos: PasoDto[] | PasoEdicionDto[],
    tipo: string,
    fotos: Express.Multer.File[],
    usuarioId: string,
  ) {
    return Promise.all(
      pasos.map(async (paso) => {
        const { titulo, texto, fotos: indices = [] } = paso;
        const conservadas = (paso as PasoEdicionDto).imagenes ?? [];
        const nuevas = await Promise.all(
          indices.map(async (indice) => {
            const { url } = await this.imagenesService.guardar(
              fotos[indice],
              Destino.PUBLICACIONES,
              usuarioId,
              `${tipo}-paso-${indice}`,
            );
            return url;
          }),
        );
        const imagenes = [...conservadas, ...nuevas];
        return {
          ...(texto && { texto }),
          ...(titulo && { titulo }),
          ...(imagenes.length && { imagenes }),
        };
      }),
    );
  }

  async editar(
    id: string,
    usuarioId: string,
    dto: EditarPublicacionDto,
    archivos?: ArchivosPublicacion,
  ) {
    const actual = await this.publicacionModel
      .findOne({ _id: id, activa: true })
      .select('usuario tipo pasos')
      .lean<PublicacionEditable>();
    if (!actual) {
      throw this.noEncontrada();
    }
    if (String(actual.usuario) !== usuarioId) {
      throw new ForbiddenException({
        message: 'Sólo podés editar tus propias publicaciones',
        codigo: 'PUBLICACION_AJENA',
      });
    }
    const fotosNuevas = archivos?.imagenesPasos ?? [];
    this.validarFotosDePasos(dto.pasos, fotosNuevas.length);
    this.validarFotosConservadas(dto.pasos, actual.pasos);

    const portada = archivos?.imagen?.[0];
    const urlPortada = portada
      ? (
          await this.imagenesService.guardar(
            portada,
            Destino.PUBLICACIONES,
            usuarioId,
            actual.tipo,
          )
        ).url
      : undefined;
    const pasos = dto.pasos?.length
      ? await this.subirFotosDePasos(
          dto.pasos,
          actual.tipo,
          fotosNuevas,
          usuarioId,
        )
      : undefined;

    const nuevos = {
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      fechaEdicion: new Date(),
      ingredientes: dto.ingredientes?.length ? dto.ingredientes : undefined,
      pasos,
      porciones: dto.porciones,
      tipoRinde: dto.tipoRinde,
      tiempoMinutos: dto.tiempoMinutos,
      costo: dto.costo,
      calorias: dto.calorias,
      imagen: urlPortada,
    };
    const quitar = dto.quitarImagen && !urlPortada ? ['imagen'] : [];
    const sinValor = Object.entries(nuevos)
      .filter(([campo, valor]) => valor === undefined && campo !== 'imagen')
      .map(([campo]) => campo)
      .concat(quitar);
    await this.publicacionModel.updateOne(
      { _id: id },
      {
        $set: Object.fromEntries(
          Object.entries(nuevos).filter(([, valor]) => valor !== undefined),
        ),
        ...(sinValor.length && {
          $unset: Object.fromEntries(sinValor.map((campo) => [campo, ''])),
        }),
      },
    );
    await this.cache.clear();
    this.logger.info(
      EVENTOS_DE_LOG.PUBLICACION_EDITADA,
      'Publicación editada',
      {
        id_publicacion: id,
        id_usuario: usuarioId,
        nombre_usuario: await this.nombreDe(usuarioId),
        tipo: actual.tipo,
      },
    );
    return this.obtener(id, usuarioId);
  }

  private validarFotosConservadas(
    pasos: PasoEdicionDto[] | undefined,
    pasosActuales: PublicacionEditable['pasos'],
  ) {
    const existentes = new Set(
      (pasosActuales ?? []).flatMap(({ imagenes }) => imagenes ?? []),
    );
    const conservadas = (pasos ?? []).flatMap(({ imagenes }) => imagenes ?? []);
    const repetida = new Set(conservadas).size !== conservadas.length;
    const ajena = conservadas.some((url) => !existentes.has(url));
    const demasiadas = (pasos ?? []).some(
      ({ imagenes, fotos }) =>
        (imagenes?.length ?? 0) + (fotos?.length ?? 0) > MAXIMO_FOTOS_POR_PASO,
    );
    if (repetida || ajena || demasiadas) {
      throw this.fotoDePasoInvalida(
        'Las fotos que se conservan no pertenecen a esta publicación',
      );
    }
  }

  async obtener(id: string, usuarioId: string) {
    const publicacion = await this.publicacionModel
      .findOne({ _id: id, activa: true })
      .populate('usuario', CAMPOS_AUTOR)
      .lean();
    if (!publicacion) {
      throw this.noEncontrada();
    }
    const [conMarca] = await this.marcarMeGusta([publicacion], usuarioId);
    return conMarca;
  }

  async listar(consulta: ListarPublicacionesDto, usuarioId: string) {
    const { offset, limit, orden, usuario, tipo, q } = consulta;
    const clave = `listado:${orden}:${usuario ?? 'todos'}:${tipo ?? 'todos'}:${offset}:${limit}`;
    let listado = q ? undefined : await this.cache.get<Listado>(clave);

    if (!listado) {
      const publicaciones = await this.publicacionModel
        .find({
          activa: true,
          ...(usuario && { usuario }),
          ...(tipo && { tipo }),
          ...(q && filtroDeBusqueda(q)),
        })
        .sort(ORDENES[orden])
        .skip(offset)
        .limit(limit + 1)
        .populate('usuario', CAMPOS_AUTOR)
        .lean();

      listado = {
        datos: publicaciones.slice(0, limit),
        offset,
        limit,
        hayMas: publicaciones.length > limit,
      };
      if (!q) {
        await this.cache.set(clave, listado);
      }
    }

    return {
      ...listado,
      datos: await this.marcarMeGusta(listado.datos, usuarioId),
    };
  }

  async eliminar(id: string, solicitante: Solicitante) {
    const publicacion = await this.buscarActiva(id);
    const esDueno = String(publicacion.usuario._id) === solicitante.id;
    if (!esDueno && solicitante.perfil !== 'administrador') {
      throw new ForbiddenException({
        message: 'Sólo podés eliminar tus propias publicaciones',
        codigo: 'PUBLICACION_AJENA',
      });
    }
    await this.publicacionModel.updateOne({ _id: id }, { activa: false });
    await this.cache.clear();
    this.logger.info(
      EVENTOS_DE_LOG.PUBLICACION_ELIMINADA,
      'Publicación eliminada',
      {
        id_publicacion: id,
        id_usuario: solicitante.id,
        nombre_usuario: await this.nombreDe(solicitante.id),
        id_autor: String(publicacion.usuario._id),
        nombre_autor: publicacion.usuario.nombreUsuario,
        por_administrador: !esDueno,
      },
    );
  }

  async darMeGusta(id: string, usuarioId: string) {
    const publicacion = await this.buscarActiva(id);
    try {
      await this.meGustaModel.create({ usuario: usuarioId, publicacion: id });
    } catch (error) {
      if (esClaveDuplicada(error)) {
        throw new ConflictException({
          message: 'Ya le diste me gusta a esta publicación',
          codigo: 'ME_GUSTA_REPETIDO',
        });
      }
      throw error;
    }
    const cantidadMeGusta = await this.sumarMeGusta(id, 1);
    await this.dejarConstancia('dado', publicacion, usuarioId, cantidadMeGusta);
    return { meGusta: true, cantidadMeGusta };
  }

  async quitarMeGusta(id: string, usuarioId: string) {
    const publicacion = await this.buscarActiva(id);
    const { deletedCount } = await this.meGustaModel.deleteOne({
      usuario: usuarioId,
      publicacion: id,
    });
    if (!deletedCount) {
      throw new NotFoundException({
        message: 'No le habías dado me gusta a esta publicación',
        codigo: 'ME_GUSTA_INEXISTENTE',
      });
    }
    const cantidadMeGusta = await this.sumarMeGusta(id, -1);
    await this.dejarConstancia(
      'quitado',
      publicacion,
      usuarioId,
      cantidadMeGusta,
    );
  }

  private async dejarConstancia(
    tipo: 'dado' | 'quitado',
    publicacion: PublicacionConAutor,
    usuarioId: string,
    cantidadMeGusta: number,
  ) {
    const nombreUsuario = await this.nombreDe(usuarioId);
    const datos = {
      id_publicacion: String(publicacion._id),
      id_usuario: usuarioId,
      nombre_usuario: nombreUsuario,
      id_autor: String(publicacion.usuario._id),
      nombre_autor: publicacion.usuario.nombreUsuario,
      cantidad_me_gusta: cantidadMeGusta,
    };
    if (tipo === 'dado') {
      this.logger.info(EVENTOS_DE_LOG.ME_GUSTA_DADO, 'Me gusta dado', datos);
      await this.notificaciones.notificar({
        tipo: 'me_gusta',
        destinatarioId: String(publicacion.usuario._id),
        actor: { id: usuarioId, nombreUsuario: nombreUsuario ?? '' },
        publicacion: {
          id: String(publicacion._id),
          titulo: publicacion.titulo,
        },
      });
    } else {
      this.logger.info(
        EVENTOS_DE_LOG.ME_GUSTA_QUITADO,
        'Me gusta quitado',
        datos,
      );
    }
    await this.eventos.registrar({
      tipo,
      usuario: { id: usuarioId, nombreUsuario: nombreUsuario ?? '' },
      publicacion: { id: String(publicacion._id), titulo: publicacion.titulo },
      autor: {
        id: String(publicacion.usuario._id),
        nombreUsuario: publicacion.usuario.nombreUsuario,
      },
      cantidadMeGusta,
    });
  }

  private async buscarActiva(id: string): Promise<PublicacionConAutor> {
    const publicacion = await this.publicacionModel
      .findOne({ _id: id, activa: true })
      .select('titulo usuario')
      .populate('usuario', 'nombreUsuario')
      .lean<PublicacionConAutor>();
    if (!publicacion) {
      throw this.noEncontrada();
    }
    return publicacion;
  }

  private async nombreDe(usuarioId: string) {
    const usuario = await this.usuarioModel
      .findById(usuarioId)
      .select('nombreUsuario')
      .lean();
    return usuario?.nombreUsuario;
  }

  private async sumarMeGusta(id: string, cambio: 1 | -1) {
    const publicacion = await this.publicacionModel
      .findByIdAndUpdate(
        id,
        { $inc: { cantidadMeGusta: cambio } },
        { returnDocument: 'after' },
      )
      .select('cantidadMeGusta')
      .lean();
    await this.cache.clear();
    return publicacion?.cantidadMeGusta ?? 0;
  }

  private async marcarMeGusta<T extends PublicacionConId>(
    publicaciones: T[],
    usuarioId: string,
  ) {
    if (!publicaciones.length) {
      return [];
    }
    const dados = await this.meGustaModel
      .find({
        usuario: usuarioId,
        publicacion: { $in: publicaciones.map(({ _id }) => _id) },
      })
      .select('publicacion')
      .lean();
    const ids = new Set(dados.map(({ publicacion }) => String(publicacion)));
    return publicaciones.map((publicacion) => ({
      ...publicacion,
      meGusta: ids.has(String(publicacion._id)),
    }));
  }

  private noEncontrada() {
    return new NotFoundException({
      message: 'La publicación no existe',
      codigo: 'PUBLICACION_NO_ENCONTRADA',
    });
  }
}
