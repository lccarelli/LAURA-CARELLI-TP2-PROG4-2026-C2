import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { appConfig } from './app.config.js';
import { AppModule } from './app.module.js';

import { LoggerGlobal } from './logs/logger-global.js';
import { EVENTOS_DE_LOG, LoggerFactory } from './logs/logs.factory.js';
import { aplicarSeguridadGlobal } from './seguridad-global.js';
import { configurarSwagger } from './swagger.js';
import { aplicarValidacionGlobal } from './validacion-global.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerGlobal(),
  });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  aplicarSeguridadGlobal(app);
  aplicarValidacionGlobal(app);
  configurarSwagger(app);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  app.enableCors({ origin: config.urlFrontend });
  await app.listen(config.puerto);
  app
    .get(LoggerFactory)
    .crear('Bootstrap')
    .info(EVENTOS_DE_LOG.SERVIDOR_INICIADO, 'Servidor escuchando', {
      puerto: config.puerto,
    });
}
await bootstrap();
