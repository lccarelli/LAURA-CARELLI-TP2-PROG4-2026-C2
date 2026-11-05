import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import type { Nivel } from './logger-global.js';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from './logs.factory.js';

type SolicitudConUsuarioOpcional = Request & {
  usuario?: SolicitudAutenticada['usuario'];
};

@Injectable()
export class LogsHttpInterceptor implements NestInterceptor {
  private readonly logger: ContextLogger;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.crear(LogsHttpInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextoHttp = context.switchToHttp();
    const solicitud = contextoHttp.getRequest<SolicitudConUsuarioOpcional>();
    const respuesta = contextoHttp.getResponse<Response>();
    const momentoDeInicio = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.registrarEnLog(solicitud, respuesta.statusCode, momentoDeInicio),
        error: (error: unknown) =>
          this.registrarEnLog(
            solicitud,
            this.obtenerEstadoError(error),
            momentoDeInicio,
          ),
      }),
    );
  }

  private registrarEnLog(
    solicitud: SolicitudConUsuarioOpcional,
    estadoHttp: number,
    momentoDeInicio: number,
  ) {
    const { nivel, evento } = this.clasificarPorEstado(estadoHttp);
    this.logger.registrar(
      nivel,
      evento,
      `${solicitud.method} ${solicitud.path} ${estadoHttp}`,
      {
        metodo: solicitud.method,
        path: solicitud.path,
        estado_http: estadoHttp,
        latencia_ms: Date.now() - momentoDeInicio,
        ip: solicitud.ip,
        id_usuario: solicitud.usuario?.id,
      },
    );
  }

  private obtenerEstadoError(error: unknown): number {
    return error instanceof HttpException
      ? error.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private clasificarPorEstado(estadoHttp: number): {
    nivel: Nivel;
    evento: string;
  } {
    if (estadoHttp >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { nivel: 'error', evento: EVENTOS_DE_LOG.SOLICITUD_FALLIDA };
    }
    if (estadoHttp >= HttpStatus.BAD_REQUEST) {
      return { nivel: 'warn', evento: EVENTOS_DE_LOG.SOLICITUD_RECHAZADA };
    }
    return { nivel: 'info', evento: EVENTOS_DE_LOG.SOLICITUD_EXITOSA };
  }
}
