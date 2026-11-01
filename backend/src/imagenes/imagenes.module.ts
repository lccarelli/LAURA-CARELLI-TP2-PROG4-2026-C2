import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import {
  Publicacion,
  PublicacionSchema,
} from '../publicaciones/schemas/publicacion.schema.js';
import { Usuario, UsuarioSchema } from '../usuarios/schemas/usuario.schema.js';
import { CloudinaryCliente } from './cloudinary.cliente.js';
import { ImagenesController } from './imagenes.controller.js';
import { ImagenesService } from './imagenes.service.js';
import { Imagen, ImagenSchema } from './schemas/imagen.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Imagen.name, schema: ImagenSchema },
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ImagenesController],
  providers: [ImagenesService, CloudinaryCliente],
  exports: [ImagenesService],
})
export class ImagenesModule {}
