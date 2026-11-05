import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerFactory } from './logs.factory.js';
import { LogsHttpInterceptor } from './logs-http.interceptor.js';
import { asignarIdSolicitud } from './id-solicitud.middleware.js';

@Global()
@Module({
  providers: [
    LoggerFactory,
    { provide: APP_INTERCEPTOR, useClass: LogsHttpInterceptor },
  ],
  exports: [LoggerFactory],
})
export class LogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(asignarIdSolicitud).forRoutes('*path');
  }
}
