import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { Comentario } from './schemas/comentario.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';

type AutorDeLaPublicacion = {
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

  async crear(
    publicacionId: string,
    usuarioId: string,
    dto: CrearComentarioDto,
  ) {
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
}
