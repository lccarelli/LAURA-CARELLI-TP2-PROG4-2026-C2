import { Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { appConfig } from './app.config.js';
import { AppModule } from './app.module.js';
import { logsHttp } from './common/logs-http.middleware.js';
import { aplicarValidacionGlobal } from './validacion-global.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(logsHttp);
  aplicarValidacionGlobal(app);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  app.enableCors({ origin: config.urlFrontend });
  await app.listen(config.puerto);
  Logger.log(`Servidor escuchando en el puerto ${config.puerto}`, 'Bootstrap');
}
await bootstrap();
