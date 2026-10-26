import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

const SECRETO = 'secreto-de-pruebas';

function contexto(authorization?: string) {
  const solicitud: Record<string, any> = { headers: { authorization } };
  const ejecucion = {
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as ExecutionContext;
  return { ejecucion, solicitud };
}

describe('AuthGuard', () => {
  const config = { getOrThrow: () => SECRETO } as unknown as ConfigService;
  const authService = new AuthService(
    config,
    {} as UsuariosService,
    {} as ImagenesService,
  );
  const guard = new AuthGuard(authService);

  it('[Z] sin header Authorization responde 401', () => {
    const { ejecucion } = contexto();

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });

  it('[O] con un token válido deja pasar y guarda quién es el usuario', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, SECRETO);
    const { ejecucion, solicitud } = contexto(`Bearer ${token}`);

    expect(guard.canActivate(ejecucion)).toBe(true);
    expect(solicitud.usuario).toEqual({ id: 'abc123', perfil: 'usuario' });
  });

  it('[B] un token que venció hace un segundo responde 401', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, SECRETO, {
      expiresIn: -1,
    });
    const { ejecucion } = contexto(`Bearer ${token}`);

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });

  it('[B] un token que vence en un minuto todavía pasa', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, SECRETO, {
      expiresIn: 60,
    });
    const { ejecucion } = contexto(`Bearer ${token}`);

    expect(guard.canActivate(ejecucion)).toBe(true);
  });

  it('[I] el header sin la palabra Bearer responde 401', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, SECRETO);
    const { ejecucion } = contexto(token);

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });

  it('[I] un token válido con otro esquema distinto de Bearer responde 401', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, SECRETO);
    const { ejecucion } = contexto(`Basic ${token}`);

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });

  it('[E] un token firmado con otra clave responde 401', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, 'otra-clave');
    const { ejecucion } = contexto(`Bearer ${token}`);

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });

  it('[E] un texto que no es un token responde 401', () => {
    const { ejecucion } = contexto('Bearer esto-no-es-un-token');

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });
});
