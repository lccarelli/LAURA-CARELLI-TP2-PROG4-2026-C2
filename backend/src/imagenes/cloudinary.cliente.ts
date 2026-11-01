import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { Destino } from './destinos.js';
import { imagenesConfig } from './imagenes.config.js';

@Injectable()
export class CloudinaryCliente {
  constructor(
    @Inject(imagenesConfig.KEY)
    private readonly config: ConfigType<typeof imagenesConfig>,
  ) {
    cloudinary.config({
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      cloud_name: config.cloudName,
    });
  }

  async subir(archivo: Express.Multer.File, destino: Destino, nombre: string) {
    const base64 = archivo.buffer.toString('base64');
    const uri = `data:${archivo.mimetype};base64,${base64}`;

    const resultado = await cloudinary.uploader.upload(uri, {
      folder: `${this.config.carpeta}/${destino}`,
      public_id: nombre,
    });
    return { url: resultado.secure_url, publicId: resultado.public_id };
  }

  async borrar(publicId: string) {
    await cloudinary.uploader.destroy(publicId);
  }
}
