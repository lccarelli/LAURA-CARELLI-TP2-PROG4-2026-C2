import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { AuthService } from './auth.service.js';

export type SolicitudAutenticada = Request & {
  usuario: { id: string; perfil: string };
};

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger: ContextLogger;

  constructor(
    private readonly authService: AuthService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(AuthGuard.name);
  }

  canActivate(context: ExecutionContext) {
    const solicitud = context.switchToHttp().getRequest<SolicitudAutenticada>();
    const [tipo, token] = (solicitud.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      this.logger.advertir(
        EVENTOS_DE_LOG.TOKEN_AUSENTE,
        'Solicitud sin token',
        {
          metodo: solicitud.method,
          url: solicitud.originalUrl,
        },
      );
      throw new UnauthorizedException({
        message: 'Falta el token',
        codigo: 'TOKEN_AUSENTE',
      });
    }
    solicitud.usuario = this.authService.verificarToken(token);
    return true;
  }
}
