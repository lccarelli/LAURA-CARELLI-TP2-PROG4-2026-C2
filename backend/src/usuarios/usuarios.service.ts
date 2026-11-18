import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { authConfig } from '../auth/auth.config.js';
import type { RegistroDto } from '../auth/dto/registro.dto.js';
import { baseDeNombreDeUsuario, conSufijo } from '../auth/nombre-de-usuario.js';
import type { PerfilGoogle } from '../auth/cliente-google.js';
import { claveAleatoria } from './cuenta-docente.js';
import { patronDePalabra } from '../common/busqueda.js';
import { Destino } from '../imagenes/destinos.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { EditarPerfilDto } from './dto/editar-perfil.dto.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { Usuario } from './schemas/usuario.schema.js';
import { Visita } from './schemas/visita.schema.js';

const CAMPOS_DIRECTORIO = 'nombre apellido nombreUsuario imagenPerfil';
const LIMITE_DIRECTORIO = 10;

const INTENTOS_DE_NOMBRE_DE_USUARIO = 50;

@Injectable()
export class UsuariosService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Visita.name) private readonly visitaModel: Model<Visita>,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly imagenesService: ImagenesService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(UsuariosService.name);
  }

  async crearComoAdministrador(
    administradorId: string,
    dto: CrearUsuarioDto,
    imagen?: Express.Multer.File,
  ) {
    const usuario = await this.registrar(dto, dto.perfil, imagen);
    this.logger.info(EVENTOS_DE_LOG.USUARIO_CREADO, 'Usuario creado', {
      id_usuario: String(usuario!._id),
      nombre_usuario: usuario!.nombreUsuario,
      perfil: usuario!.perfil,
      id_administrador: administradorId,
    });
    return usuario;
  }

  async registrar(
    dto: RegistroDto,
    perfil: string,
    imagen?: Express.Multer.File,
  ) {
    const fechaNacimiento = new Date(dto.fechaNacimiento);
    if (fechaNacimiento > new Date()) {
      throw new BadRequestException({
        message: 'fechaNacimiento no puede ser una fecha futura',
        codigo: 'FECHA_FUTURA',
      });
    }

    const clave = await bcrypt.hash(dto.clave, this.config.rondasBcrypt);
    const usuarioId = new Types.ObjectId();
    const imagenPerfil = imagen
      ? (
          await this.imagenesService.guardar(
            imagen,
            Destino.PERFILES,
            String(usuarioId),
          )
        ).url
      : undefined;

    return this.crear({
      ...dto,
      _id: usuarioId,
      clave,
      fechaNacimiento,
      perfil,
      imagenPerfil,
    });
  }

  buscarParaGoogle(googleId: string, correo: string) {
    return this.usuarioModel
      .findOne({ $or: [{ googleId }, { correo }] })
      .select('+googleId')
      .lean();
  }

  vincularGoogle(id: Types.ObjectId, googleId: string) {
    return this.usuarioModel.updateOne({ _id: id }, { googleId });
  }

  async crearDesdeGoogle(
    perfilGoogle: PerfilGoogle,
    perfil: string,
    foto?: Express.Multer.File | null,
  ) {
    const usuarioId = new Types.ObjectId();
    const clave = await bcrypt.hash(claveAleatoria(), this.config.rondasBcrypt);
    const base = baseDeNombreDeUsuario(perfilGoogle.correo);
    const imagenPerfil = await this.copiarFotoDeGoogle(foto, usuarioId);
    for (let intento = 0; intento < INTENTOS_DE_NOMBRE_DE_USUARIO; intento++) {
      try {
        return await this.crear({
          _id: usuarioId,
          nombre: perfilGoogle.nombre ?? base,
          apellido: perfilGoogle.apellido,
          correo: perfilGoogle.correo,
          nombreUsuario: conSufijo(base, intento),
          clave,
          googleId: perfilGoogle.id,
          perfil,
          imagenPerfil,
        });
      } catch (error) {
        const repetido =
          error instanceof ConflictException &&
          (error.getResponse() as { codigo?: string }).codigo ===
            'USUARIO_REPETIDO';
        if (!repetido) {
          throw error;
        }
      }
    }
    throw new ConflictException({
      message: 'No se pudo generar un nombre de usuario',
      codigo: 'USUARIO_REPETIDO',
    });
  }

  private async copiarFotoDeGoogle(
    foto: Express.Multer.File | null | undefined,
    usuarioId: Types.ObjectId,
  ) {
    if (!foto) {
      return undefined;
    }
    try {
      const guardada = await this.imagenesService.guardar(
        foto,
        Destino.PERFILES,
        String(usuarioId),
      );
      return guardada.url;
    } catch (error) {
      this.logger.advertir(
        EVENTOS_DE_LOG.FOTO_GOOGLE_NO_COPIADA,
        'No se pudo copiar la foto de Google',
        { id_usuario: String(usuarioId), motivo: (error as Error).message },
      );
      return undefined;
    }
  }

  async perfilPublico(id: string) {
    const usuario = await this.usuarioModel
      .findOne({ _id: id, habilitado: true })
      .select('nombre apellido nombreUsuario imagenPerfil descripcion')
      .lean();
    if (!usuario) {
      throw new NotFoundException({
        message: 'El usuario no existe',
        codigo: 'USUARIO_NO_ENCONTRADO',
      });
    }
    return usuario;
  }

  async directorio(texto: string, usuarioId: string) {
    const palabras = texto.split(' ').map((palabra) => {
      const coincide = new RegExp(patronDePalabra(palabra), 'i');
      return {
        $or: [
          { nombre: coincide },
          { apellido: coincide },
          { nombreUsuario: coincide },
        ],
      };
    });
    const datos = await this.usuarioModel
      .find({ habilitado: true, _id: { $ne: usuarioId }, $and: palabras })
      .select(CAMPOS_DIRECTORIO)
      .sort({ nombreUsuario: 1 })
      .limit(LIMITE_DIRECTORIO)
      .lean();
    return { datos };
  }

  async registrarVisita(visitanteId: string, id: string) {
    if (visitanteId === id) {
      throw new BadRequestException({
        message: 'No se registran las visitas al propio perfil',
        codigo: 'VISITA_PROPIA',
      });
    }
    await this.perfilPublico(id);
    await this.visitaModel.create({ visitante: visitanteId, visitado: id });
    this.logger.info(EVENTOS_DE_LOG.VISITA_REGISTRADA, 'Visita registrada', {
      id_visitante: visitanteId,
      id_visitado: id,
    });
    return { registrada: true };
  }

  async asegurarCuentaDeAdministrador(dto: RegistroDto) {
    const existente = await this.usuarioModel
      .findOne({ correo: dto.correo })
      .lean();
    if (!existente) {
      const creado = await this.registrar(dto, 'administrador');
      return { accion: 'creada' as const, usuario: creado };
    }
    const clave = await bcrypt.hash(dto.clave, this.config.rondasBcrypt);
    await this.usuarioModel.updateOne(
      { _id: existente._id },
      { perfil: 'administrador', habilitado: true, clave },
    );
    return {
      accion: 'actualizada' as const,
      usuario: await this.usuarioModel.findById(existente._id).lean(),
    };
  }

  async crear(datos: Partial<Usuario> & { _id?: Types.ObjectId }) {
    try {
      const creado = await this.usuarioModel.create(datos);
      return await this.usuarioModel.findById(creado._id).lean();
    } catch (error: any) {
      if (error.code === 11000) {
        const campo = Object.keys(error.keyPattern)[0];
        const esCorreo = campo === 'correo';
        throw new ConflictException({
          message: `El ${esCorreo ? 'correo' : 'nombre de usuario'} ya está registrado`,
          codigo: esCorreo ? 'CORREO_REPETIDO' : 'USUARIO_REPETIDO',
        });
      }
      throw error;
    }
  }

  buscarPorIdentificador(identificador: string) {
    return this.usuarioModel
      .findOne({
        $or: [{ correo: identificador }, { nombreUsuario: identificador }],
      })
      .select('+clave')
      .lean();
  }

  buscarPorId(id: string) {
    return this.usuarioModel.findById(id).lean();
  }

  async listar(offset: number, limit: number) {
    const usuarios = await this.usuarioModel
      .find()
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .lean();

    return {
      datos: usuarios.slice(0, limit),
      offset,
      limit,
      hayMas: usuarios.length > limit,
    };
  }

  async editarPerfil(
    id: string,
    dto: EditarPerfilDto,
    imagen?: Express.Multer.File,
  ) {
    const imagenPerfil = imagen
      ? (await this.imagenesService.guardar(imagen, Destino.PERFILES, id)).url
      : undefined;
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            nombre: dto.nombre,
            apellido: dto.apellido,
            descripcion: dto.descripcion,
            ...(imagenPerfil && { imagenPerfil }),
          },
          ...(dto.quitarImagen &&
            !imagenPerfil && { $unset: { imagenPerfil: '' } }),
        },
        { new: true },
      )
      .lean();
    if (!usuario) {
      throw new NotFoundException({
        message: 'El usuario no existe',
        codigo: 'USUARIO_NO_ENCONTRADO',
      });
    }
    this.logger.info(EVENTOS_DE_LOG.USUARIO_EDITADO, 'Perfil editado', {
      id_usuario: id,
      nombre_usuario: usuario.nombreUsuario,
    });
    return usuario;
  }

  async cambiarHabilitado(
    id: string,
    habilitado: boolean,
    administradorId: string,
  ) {
    if (id === administradorId) {
      throw new BadRequestException({
        message: 'No se puede cambiar el estado de la propia cuenta',
        codigo: 'CUENTA_PROPIA',
      });
    }

    const resultado = await this.usuarioModel.updateOne(
      { _id: id },
      { habilitado },
    );
    if (resultado.matchedCount === 0) {
      throw new NotFoundException({
        message: 'El usuario no existe',
        codigo: 'USUARIO_NO_ENCONTRADO',
      });
    }
    if (resultado.modifiedCount > 0) {
      this.logger.info(
        habilitado
          ? EVENTOS_DE_LOG.USUARIO_HABILITADO
          : EVENTOS_DE_LOG.USUARIO_DESHABILITADO,
        habilitado ? 'Usuario habilitado' : 'Usuario deshabilitado',
        { id_usuario: id, id_administrador: administradorId },
      );
    }
    return this.usuarioModel.findById(id).lean();
  }
}
