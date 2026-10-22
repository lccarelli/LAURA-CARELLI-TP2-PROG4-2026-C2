import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { logsHttp } from './common/logs-http.middleware.js';
import { aplicarValidacionGlobal } from './validacion-global.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(logsHttp);
  aplicarValidacionGlobal(app);
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  });
  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);
  Logger.log(`Servidor escuchando en el puerto ${puerto}`, 'Bootstrap');
}
await bootstrap();
