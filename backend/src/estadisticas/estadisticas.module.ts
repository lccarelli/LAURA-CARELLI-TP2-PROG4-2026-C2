import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { Ingreso, IngresoSchema } from '../auth/schemas/ingreso.schema.js';
import {
  Comentario,
  ComentarioSchema,
} from '../publicaciones/schemas/comentario.schema.js';
import {
  EventoMeGusta,
  EventoMeGustaSchema,
} from '../publicaciones/schemas/evento-me-gusta.schema.js';
import {
  Publicacion,
  PublicacionSchema,
} from '../publicaciones/schemas/publicacion.schema.js';
import { Visita, VisitaSchema } from '../usuarios/schemas/visita.schema.js';
import { EstadisticasController } from './estadisticas.controller.js';
import { EstadisticasRepositorio } from './estadisticas.repositorio.js';
import { EstadisticasService } from './estadisticas.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Comentario.name, schema: ComentarioSchema },
      { name: Ingreso.name, schema: IngresoSchema },
      { name: Visita.name, schema: VisitaSchema },
      { name: EventoMeGusta.name, schema: EventoMeGustaSchema },
    ]),
    AuthModule,
  ],
  controllers: [EstadisticasController],
  providers: [EstadisticasService, EstadisticasRepositorio],
})
export class EstadisticasModule {}
