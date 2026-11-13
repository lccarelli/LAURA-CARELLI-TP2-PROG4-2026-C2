import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import {
  Comentario,
  ComentarioSchema,
} from '../publicaciones/schemas/comentario.schema.js';
import {
  Publicacion,
  PublicacionSchema,
} from '../publicaciones/schemas/publicacion.schema.js';
import { EstadisticasController } from './estadisticas.controller.js';
import { EstadisticasService } from './estadisticas.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Comentario.name, schema: ComentarioSchema },
    ]),
    AuthModule,
  ],
  controllers: [EstadisticasController],
  providers: [EstadisticasService],
})
export class EstadisticasModule {}
