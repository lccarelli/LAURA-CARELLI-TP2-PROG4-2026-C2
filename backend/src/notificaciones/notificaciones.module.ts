import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { NotificacionesController } from './notificaciones.controller.js';
import { NotificacionesService } from './notificaciones.service.js';
import {
  Notificacion,
  NotificacionSchema,
} from './schemas/notificacion.schema.js';
import { webhookConfig } from './webhook.config.js';
import { WebhookService } from './webhook.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notificacion.name, schema: NotificacionSchema },
    ]),
    ConfigModule.forFeature(webhookConfig),
    AuthModule,
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, WebhookService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
