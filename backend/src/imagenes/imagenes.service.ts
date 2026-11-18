import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { CloudinaryCliente } from './cloudinary.cliente.js';
import type { Destino } from './destinos.js';
import { Imagen } from './schemas/imagen.schema.js';

@Injectable()
export class ImagenesService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Imagen.name) private readonly imagenModel: Model<Imagen>,
    private readonly cloudinary: CloudinaryCliente,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(ImagenesService.name);
  }

  async guardar(
    archivo: Express.Multer.File,
    destino: Destino,
    usuarioId: string,
    tipo: string = destino,
  ) {
    const nombre = `${usuarioId}-${tipo}-${Date.now()}`;
    const { url, publicId } = await this.cloudinary.subir(
      archivo,
      destino,
      nombre,
    );
    const creada = await this.imagenModel.create({
      url,
      publicId,
      destino,
      mimetype: archivo.mimetype,
      tamano: archivo.size,
      usuario: usuarioId,
    });
    this.logger.info(EVENTOS_DE_LOG.IMAGEN_SUBIDA, 'Imagen subida', {
      public_id: publicId,
      destino,
      tipo_mime: archivo.mimetype,
      tamano_bytes: archivo.size,
    });
    return creada.toObject();
  }

  async descartar(imagen: { _id: unknown; publicId: string }) {
    try {
      await this.cloudinary.borrar(imagen.publicId);
      await this.imagenModel.deleteOne({ _id: imagen._id });
      this.logger.info(EVENTOS_DE_LOG.IMAGEN_BORRADA, 'Imagen borrada', {
        public_id: imagen.publicId,
      });
    } catch (error) {
      this.logger.advertir(
        EVENTOS_DE_LOG.IMAGEN_NO_BORRADA,
        'No se pudo borrar la imagen',
        { public_id: imagen.publicId, motivo: (error as Error).message },
      );
    }
  }
}
