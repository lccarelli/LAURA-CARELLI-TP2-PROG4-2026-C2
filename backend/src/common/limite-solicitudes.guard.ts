import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';

@Injectable()
export class LimiteSolicitudesGuard extends ThrottlerGuard {
  private readonly loggerDeClase: ContextLogger;

  constructor(
    @InjectThrottlerOptions() opciones: ThrottlerModuleOptions,
    @InjectThrottlerStorage() almacenamiento: ThrottlerStorage,
    reflector: Reflector,
    loggerFactory: LoggerFactory,
  ) {
    super(opciones, almacenamiento, reflector);
    this.loggerDeClase = loggerFactory.crear(LimiteSolicitudesGuard.name);
  }

  protected throwThrottlingException(
    contexto: ExecutionContext,
    detalle: ThrottlerLimitDetail,
  ): Promise<void> {
    const http = contexto.switchToHttp();
    const solicitud = http.getRequest<Request>();
    http
      .getResponse<Response>()
      .setHeader('Retry-After', detalle.timeToBlockExpire);
    this.loggerDeClase.advertir(
      EVENTOS_DE_LOG.LIMITE_SUPERADO,
      'Límite de solicitudes superado',
      {
        metodo: solicitud.method,
        url: solicitud.originalUrl,
        ip: solicitud.ip,
      },
    );
    throw new HttpException(
      {
        message: 'Demasiadas solicitudes, espera un momento',
        codigo: 'DEMASIADAS_SOLICITUDES',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
