import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';
import {
  Publicacion,
  PublicacionSchema,
} from './schemas/publicacion.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
    ]),
    AuthModule,
    ImagenesModule,
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
})
export class PublicacionesModule {}
