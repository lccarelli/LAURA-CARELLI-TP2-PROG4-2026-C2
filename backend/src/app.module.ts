import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from './app.config.js';
import { LimiteSolicitudesGuard } from './common/limite-solicitudes.guard.js';
import { authConfig } from './auth/auth.config.js';
import { AuthModule } from './auth/auth.module.js';
import { EstadisticasModule } from './estadisticas/estadisticas.module.js';
import { HealthModule } from './health/health.module.js';
import { LogsModule } from './logs/logs.module.js';
import { imagenesConfig } from './imagenes/imagenes.config.js';
import { ImagenesModule } from './imagenes/imagenes.module.js';
import { LIMITES_GENERALES } from './configs/throttler.config.js';
import { PublicacionesModule } from './publicaciones/publicaciones.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, imagenesConfig],
    }),
    MongooseModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        uri: config.uriMongo,
      }),
    }),
    ThrottlerModule.forRoot(LIMITES_GENERALES),
    LogsModule,
    UsuariosModule,
    ImagenesModule,
    AuthModule,
    PublicacionesModule,
    EstadisticasModule,
    HealthModule,
  ],
  providers: [
    LimiteSolicitudesGuard,
    { provide: APP_GUARD, useExisting: LimiteSolicitudesGuard },
  ],
})
export class AppModule {}
