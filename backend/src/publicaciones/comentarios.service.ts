import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { EditarComentarioDto } from './dto/editar-comentario.dto.js';
import { Comentario } from './schemas/comentario.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';

type AutorDeLaPublicacion = {
  usuario: { _id: Types.ObjectId; nombreUsuario: string };
};

type ComentarioConAutor = Comentario & {
  _id: Types.ObjectId;
  usuario: { _id: Types.ObjectId; nombreUsuario: string };
};

const CAMPOS_AUTOR = 'nombre apellido nombreUsuario imagenPerfil';

@Injectable()
export class ComentariosService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Comentario.name)
    private readonly comentarioModel: Model<Comentario>,
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(ComentariosService.name);
  }

  async listar(publicacionId: string, { offset, limit }: PaginacionDto) {
    await this.buscarPublicacionActiva(publicacionId);

    const comentarios = await this.comentarioModel
      .find({ publicacion: publicacionId })
      .sort({ fecha: -1, _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .populate('usuario', CAMPOS_AUTOR)
      .lean();

    return {
      datos: comentarios.slice(0, limit),
      offset,
      limit,
      hayMas: comentarios.length > limit,
    };
  }

  async crear(
    publicacionId: string,
    usuarioId: string,
    dto: CrearComentarioDto,
  ) {
    const publicacion = await this.buscarPublicacionActiva(publicacionId);

    const creado = await this.comentarioModel.create({
      publicacion: publicacionId,
      usuario: usuarioId,
      mensaje: dto.mensaje,
    });
    await this.publicacionModel.updateOne(
      { _id: publicacionId },
      { $inc: { cantidadComentarios: 1 } },
    );
    await this.cache.clear();
    await creado.populate('usuario', CAMPOS_AUTOR);

    this.logger.info(EVENTOS_DE_LOG.COMENTARIO_CREADO, 'Comentario creado', {
      id_comentario: creado.id,
      id_publicacion: publicacionId,
      id_usuario: usuarioId,
      nombre_usuario: (creado.usuario as unknown as { nombreUsuario: string })
        .nombreUsuario,
      id_autor: String(publicacion.usuario._id),
      nombre_autor: publicacion.usuario.nombreUsuario,
    });
    return creado.toObject();
  }

  async editar(
    publicacionId: string,
    comentarioId: string,
    usuarioId: string,
    dto: EditarComentarioDto,
  ) {
    await this.buscarPublicacionActiva(publicacionId);

    const comentario = await this.comentarioModel
      .findOne({ _id: comentarioId, publicacion: publicacionId })
      .populate('usuario', CAMPOS_AUTOR)
      .lean<ComentarioConAutor>();
    if (!comentario) {
      throw new NotFoundException({
        message: 'El comentario no existe',
        codigo: 'COMENTARIO_NO_ENCONTRADO',
      });
    }
    if (String(comentario.usuario._id) !== usuarioId) {
      throw new ForbiddenException({
        message: 'Sólo podés editar tus propios comentarios',
        codigo: 'COMENTARIO_AJENO',
      });
    }
    if (comentario.mensaje === dto.mensaje) {
      return comentario;
    }

    const modificado = await this.comentarioModel
      .findByIdAndUpdate(
        comentarioId,
        { mensaje: dto.mensaje, modificado: true, modificadoEn: new Date() },
        { returnDocument: 'after' },
      )
      .populate('usuario', CAMPOS_AUTOR)
      .lean<ComentarioConAutor>();

    this.logger.info(
      EVENTOS_DE_LOG.COMENTARIO_MODIFICADO,
      'Comentario modificado',
      {
        id_comentario: comentarioId,
        id_publicacion: publicacionId,
        id_usuario: usuarioId,
        nombre_usuario: comentario.usuario.nombreUsuario,
      },
    );
    return modificado;
  }

  private async buscarPublicacionActiva(publicacionId: string) {
    const publicacion = await this.publicacionModel
      .findOne({ _id: publicacionId, activa: true })
      .select('usuario')
      .populate('usuario', 'nombreUsuario')
      .lean<AutorDeLaPublicacion>();
    if (!publicacion) {
      throw new NotFoundException({
        message: 'La publicación no existe',
        codigo: 'PUBLICACION_NO_ENCONTRADA',
      });
    }
    return publicacion;
  }
}
