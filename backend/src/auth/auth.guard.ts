import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';

export type SolicitudAutenticada = Request & {
  usuario: { id: string; perfil: string };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const solicitud = context.switchToHttp().getRequest<SolicitudAutenticada>();
    const [tipo, token] = (solicitud.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token');
    }
    solicitud.usuario = this.authService.verificarToken(token);
    return true;
  }
}
