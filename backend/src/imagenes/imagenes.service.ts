import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Imagen } from './schemas/imagen.schema.js';

@Injectable()
export class ImagenesService {
  private readonly logger = new Logger(ImagenesService.name);

  constructor(
    @InjectModel(Imagen.name) private readonly imagenModel: Model<Imagen>,
  ) {}

  async guardar(archivo: Express.Multer.File) {
    const imagen = await this.imagenModel.create({
      data: archivo.buffer,
      mimeType: archivo.mimetype,
    });
    const id = imagen.id as string;
    this.logger.log(
      `Imagen guardada: ${id} (${archivo.mimetype}, ${archivo.size} bytes)`,
    );
    return { id, url: `/imagenes/${id}` };
  }

  async obtener(id: string) {
    const imagen = await this.imagenModel.findById(id);
    if (!imagen) {
      throw new NotFoundException({
        message: 'Imagen no encontrada',
        codigo: 'IMAGEN_NO_ENCONTRADA',
      });
    }
    return imagen;
  }

  async borrar(id: string) {
    await this.imagenModel.findByIdAndDelete(id);
    this.logger.log(`Imagen borrada: ${id}`);
  }
}
