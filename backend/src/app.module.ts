import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { appConfig } from './app.config.js';
import { authConfig } from './auth/auth.config.js';
import { AuthModule } from './auth/auth.module.js';
import { imagenesConfig } from './imagenes/imagenes.config.js';
import { ImagenesModule } from './imagenes/imagenes.module.js';
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
    UsuariosModule,
    ImagenesModule,
    AuthModule,
    PublicacionesModule,
  ],
})
export class AppModule {}
