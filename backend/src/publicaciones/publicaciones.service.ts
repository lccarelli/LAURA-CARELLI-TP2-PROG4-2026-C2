import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import { Destino } from '../imagenes/destinos.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { Publicacion } from './schemas/publicacion.schema.js';

type Listado = {
  datos: unknown[];
  offset: number;
  limit: number;
  hayMas: boolean;
};

const CAMPOS_AUTOR = 'nombre apellido nombreUsuario imagenPerfil';

@Injectable()
export class PublicacionesService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    private readonly imagenesService: ImagenesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(PublicacionesService.name);
  }

  async crear(
    usuarioId: string,
    dto: CrearPublicacionDto,
    imagen?: Express.Multer.File,
  ) {
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

    const creada = await this.publicacionModel.create({
      usuario: usuarioId,
      tipo: dto.tipo,
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      ingredientes: dto.ingredientes,
      pasos: dto.pasos,
      porciones: dto.porciones,
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
    });
    return creada.toObject();
  }

  async obtener(id: string) {
    const publicacion = await this.publicacionModel
      .findById(id)
      .populate('usuario', CAMPOS_AUTOR)
      .lean();
    if (!publicacion) {
      throw new NotFoundException({
        message: 'La publicación no existe',
        codigo: 'PUBLICACION_NO_ENCONTRADA',
      });
    }
    return publicacion;
  }

  async listar(offset: number, limit: number) {
    const clave = `listado:${offset}:${limit}`;
    const guardado = await this.cache.get<Listado>(clave);
    if (guardado) {
      return guardado;
    }

    const publicaciones = await this.publicacionModel
      .find()
      .sort({ fecha: -1, _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .populate('usuario', CAMPOS_AUTOR)
      .lean();

    const listado = {
      datos: publicaciones.slice(0, limit),
      offset,
      limit,
      hayMas: publicaciones.length > limit,
    };
    await this.cache.set(clave, listado);
    return listado;
  }
}
