import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import type { SolicitudAutenticada } from './auth.guard.js';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger: ContextLogger;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.crear(AdminGuard.name);
  }

  canActivate(context: ExecutionContext) {
    const solicitud = context.switchToHttp().getRequest<SolicitudAutenticada>();
    if (solicitud.usuario.perfil !== 'administrador') {
      this.logger.advertir(
        EVENTOS_DE_LOG.ACCESO_DENEGADO,
        'Acceso de administración sin perfil administrador',
        {
          usuarioId: solicitud.usuario.id,
          metodo: solicitud.method,
          url: solicitud.originalUrl,
        },
      );
      throw new ForbiddenException({
        message: 'Sólo un administrador puede hacer esto',
        codigo: 'NO_ES_ADMINISTRADOR',
      });
    }
    return true;
  }
}
