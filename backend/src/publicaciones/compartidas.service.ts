import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { Usuario } from '../usuarios/schemas/usuario.schema.js';
import { CAMPOS_AUTOR, PublicacionesService } from './publicaciones.service.js';
import { Compartida } from './schemas/compartida.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';

@Injectable()
export class CompartidasService {
  constructor(
    @InjectModel(Compartida.name)
    private readonly compartidaModel: Model<Compartida>,
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly publicaciones: PublicacionesService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async compartir(id: string, usuarioId: string, destinatarios: string[]) {
    if (destinatarios.includes(usuarioId)) {
      throw new BadRequestException({
        message: 'No podés compartir una publicación con vos mismo',
        codigo: 'COMPARTIR_CON_UNO_MISMO',
      });
    }
    const publicacion = await this.publicacionModel
      .findOne({ _id: id, activa: true })
      .select('titulo')
      .lean();
    if (!publicacion) {
      throw new NotFoundException({
        message: 'La publicación no existe',
        codigo: 'PUBLICACION_NO_ENCONTRADA',
      });
    }
    const habilitados = await this.usuarioModel.countDocuments({
      _id: { $in: destinatarios },
      habilitado: true,
    });
    if (habilitados !== destinatarios.length) {
      throw new NotFoundException({
        message: 'Alguna de las personas elegidas no existe',
        codigo: 'USUARIO_NO_ENCONTRADO',
      });
    }
    await this.compartidaModel.insertMany(
      destinatarios.map((a) => ({ de: usuarioId, a, publicacion: id })),
    );
    const cantidadCompartidas = await this.publicaciones.sumarContador(
      id,
      'cantidadCompartidas',
      destinatarios.length,
    );
    await this.avisar(id, publicacion.titulo, usuarioId, destinatarios);
    return {
      compartida: true,
      destinatarios: destinatarios.length,
      cantidadCompartidas,
    };
  }

  private async avisar(
    id: string,
    titulo: string,
    usuarioId: string,
    destinatarios: string[],
  ) {
    const autor = await this.usuarioModel
      .findById(usuarioId)
      .select('nombreUsuario')
      .lean();
    await Promise.all(
      destinatarios.map((destinatarioId) =>
        this.notificaciones.notificar({
          tipo: 'compartida',
          destinatarioId,
          actor: { id: usuarioId, nombreUsuario: autor?.nombreUsuario ?? '' },
          publicacion: { id, titulo },
        }),
      ),
    );
  }

  async cantidadSinVer(usuarioId: string) {
    const cantidad = await this.compartidaModel.countDocuments({
      a: usuarioId,
      vista: { $ne: true },
    });
    return { cantidad };
  }

  async marcarVistas(usuarioId: string) {
    const { modifiedCount } = await this.compartidaModel.updateMany(
      { a: usuarioId, vista: { $ne: true } },
      { vista: true },
    );
    return { actualizadas: modifiedCount };
  }

  async listar({ offset, limit }: PaginacionDto, usuarioId: string) {
    const filas = await this.compartidaModel
      .aggregate<{ _id: unknown }>([
        { $match: { a: new Types.ObjectId(usuarioId) } },
        {
          $lookup: {
            from: 'publicaciones',
            localField: 'publicacion',
            foreignField: '_id',
            as: 'datos',
          },
        },
        { $match: { 'datos.activa': true } },
        { $sort: { fecha: -1, _id: -1 } },
        { $skip: offset },
        { $limit: limit + 1 },
        { $project: { _id: 1 } },
      ])
      .exec();
    const hayMas = filas.length > limit;
    const ids = filas.slice(0, limit).map(({ _id }) => _id);
    const compartidas = await this.compartidaModel
      .find({ _id: { $in: ids } })
      .sort({ fecha: -1, _id: -1 })
      .populate('de', CAMPOS_AUTOR)
      .populate({
        path: 'publicacion',
        populate: { path: 'usuario', select: CAMPOS_AUTOR },
      })
      .lean();
    const marcadas = await this.publicaciones.marcarDelUsuario(
      compartidas.map(
        ({ publicacion }) =>
          publicacion as unknown as Publicacion & { _id: Types.ObjectId },
      ),
      usuarioId,
    );
    return {
      datos: compartidas.map(({ de, fecha, vista }, i) => ({
        ...marcadas[i],
        compartidaPor: de,
        fechaCompartida: fecha,
        vista: vista === true,
      })),
      offset,
      limit,
      hayMas,
    };
  }
}
