import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { Usuario, UsuarioSchema } from '../usuarios/schemas/usuario.schema.js';
import { ComentariosService } from './comentarios.service.js';
import { EventosMeGustaService } from './eventos-me-gusta.service.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';
import { Comentario, ComentarioSchema } from './schemas/comentario.schema.js';
import {
  EventoMeGusta,
  EventoMeGustaSchema,
} from './schemas/evento-me-gusta.schema.js';
import { MeGusta, MeGustaSchema } from './schemas/me-gusta.schema.js';
import {
  Publicacion,
  PublicacionSchema,
} from './schemas/publicacion.schema.js';

export const TTL_LISTADO_MS = 1000;

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: MeGusta.name, schema: MeGustaSchema },
      { name: Comentario.name, schema: ComentarioSchema },
      { name: EventoMeGusta.name, schema: EventoMeGustaSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
    CacheModule.register({ ttl: TTL_LISTADO_MS }),
    AuthModule,
    ImagenesModule,
    NotificacionesModule,
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService, ComentariosService, EventosMeGustaService],
})
export class PublicacionesModule {}
