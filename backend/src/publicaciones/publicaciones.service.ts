import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { Publicacion } from './schemas/publicacion.schema.js';

const CAMPOS_AUTOR = 'nombre apellido nombreUsuario imagenPerfil';

@Injectable()
export class PublicacionesService {
  private readonly logger = new Logger(PublicacionesService.name);

  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    private readonly imagenesService: ImagenesService,
  ) {}

  async crear(
    usuarioId: string,
    dto: CrearPublicacionDto,
    imagen?: Express.Multer.File,
  ) {
    const imagenGuardada = imagen
      ? await this.imagenesService.guardar(imagen)
      : undefined;

    try {
      const creada = await this.publicacionModel.create({
        usuario: usuarioId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        ingredientes: dto.ingredientes || undefined,
        pasos: dto.pasos || undefined,
        imagen: imagenGuardada?.url,
      });
      await creada.populate('usuario', CAMPOS_AUTOR);
      this.logger.log(
        `Publicación creada: ${creada.id} (usuario ${usuarioId})`,
      );
      return creada.toObject();
    } catch (error) {
      if (imagenGuardada) {
        this.logger.warn(
          `Publicación fallida: se borra la imagen ${imagenGuardada.id}`,
        );
        await this.imagenesService.borrar(imagenGuardada.id);
      }
      throw error;
    }
  }

  async listar(offset: number, limit: number) {
    const publicaciones = await this.publicacionModel
      .find()
      .sort({ fecha: -1, _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .populate('usuario', CAMPOS_AUTOR)
      .lean();

    return {
      datos: publicaciones.slice(0, limit),
      offset,
      limit,
      hayMas: publicaciones.length > limit,
    };
  }
}
