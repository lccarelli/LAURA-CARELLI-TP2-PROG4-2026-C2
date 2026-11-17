import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ClienteWebPush } from './cliente-web-push.js';
import { PushController } from './push.controller.js';
import { pushConfig } from './push.config.js';
import { PushService } from './push.service.js';
import {
  SuscripcionPush,
  SuscripcionPushSchema,
} from './schemas/suscripcion-push.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SuscripcionPush.name, schema: SuscripcionPushSchema },
    ]),
    ConfigModule.forFeature(pushConfig),
    AuthModule,
  ],
  controllers: [PushController],
  providers: [PushService, ClienteWebPush],
  exports: [PushService],
})
export class PushModule {}
