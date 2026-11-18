import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { LoggerFactory } from '../logs/logs.factory.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { authConfig } from './auth.config.js';
import { AuthGuard } from './auth.guard.js';
import type { Model } from 'mongoose';
import type { Ingreso } from './schemas/ingreso.schema.js';
import type { ClienteGoogle } from './cliente-google.js';
import { AuthService } from './auth.service.js';

const SECRETO = 'secreto-de-pruebas';

function contexto(authorization?: string) {
  const solicitud: Record<string, any> = {
    headers: { authorization },
    method: 'GET',
    originalUrl: '/publicaciones',
  };
  const ejecucion = {
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as ExecutionContext;
  return { ejecucion, solicitud };
}

describe('AuthGuard', () => {
  const expiraJwt: SignOptions['expiresIn'] = '15m';
  const config = { secretoJwt: SECRETO, expiraJwt } as ConfigType<
    typeof authConfig
  >;
  const loggerFactory = new LoggerFactory();
  const authService = new AuthService(
    config,
    {} as UsuariosService,
    {} as Model<Ingreso>,
    {} as ClienteGoogle,
    loggerFactory,
  );
  const guard = new AuthGuard(authService, loggerFactory);

  it('[Z] sin header Authorization responde 401', () => {
    const { ejecucion } = contexto();

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
  });

  it('[Z] sin token registra la solicitud que se rechazó', () => {
    const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const { ejecucion } = contexto();

    expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
    const linea = JSON.parse(String(salida.mock.calls[0][0]));
    salida.mockRestore();
    expect(linea).toMatchObject({
      nivel: 'warn',
      modulo: 'AuthGuard',
      evento: 'token_ausente',
      metodo: 'GET',
      url: '/publicaciones',
    });
  });

  it('[O] con un token válido deja pasar y guarda quién es el usuario', () => {
    const token = jwt.sign({ sub: 'abc123', perfil: 'usuario' }, SECRETO);
    const { ejecucion, solicitud } = contexto(`Bearer ${token}`);

    expect(guard.canActivate(ejecucion)).toBe(true);
    expect(solicitud.usuario).toEqual({
      id: 'abc123',
      perfil: 'usuario',
      inicio: expect.any(Number),
    });
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

  describe('algoritmo de la firma', () => {
    const codificar = (datos: object) =>
      Buffer.from(JSON.stringify(datos)).toString('base64url');
    const contenido = { sub: 'abc123', perfil: 'administrador' };

    it('[O] un token firmado con HS256 (el que emitimos) pasa', () => {
      const token = jwt.sign(contenido, SECRETO, {
        algorithm: 'HS256',
        expiresIn: '5m',
      });
      const { ejecucion, solicitud } = contexto(`Bearer ${token}`);

      expect(guard.canActivate(ejecucion)).toBe(true);
      expect(solicitud.usuario.perfil).toBe('administrador');
    });

    it.each(['HS384', 'HS512'] as const)(
      '[E] un token firmado con %s y con el secreto correcto igual se rechaza: no es lo que emitimos',
      (algoritmo) => {
        const token = jwt.sign(contenido, SECRETO, {
          algorithm: algoritmo,
          expiresIn: '5m',
        });
        const { ejecucion } = contexto(`Bearer ${token}`);

        expect(() => guard.canActivate(ejecucion)).toThrow(
          UnauthorizedException,
        );
      },
    );

    it('[E] un token sin firma (alg: none) que se declara administrador se rechaza', () => {
      const vence = Math.floor(Date.now() / 1000) + 300;
      const sinFirma = `${codificar({ alg: 'none', typ: 'JWT' })}.${codificar({ ...contenido, exp: vence })}.`;
      const { ejecucion } = contexto(`Bearer ${sinFirma}`);

      expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
    });

    it('[E] un token de HS256 al que se le cambió el encabezado a none, dejando la firma, se rechaza', () => {
      const token = jwt.sign(contenido, SECRETO, {
        algorithm: 'HS256',
        expiresIn: '5m',
      });
      const [, cuerpo, firma] = token.split('.');
      const adulterado = `${codificar({ alg: 'none', typ: 'JWT' })}.${cuerpo}.${firma}`;
      const { ejecucion } = contexto(`Bearer ${adulterado}`);

      expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
    });

    it('[E] un token con un algoritmo de clave pública (RS256) se rechaza aunque lo envíen bien armado', () => {
      const falso = `${codificar({ alg: 'RS256', typ: 'JWT' })}.${codificar(contenido)}.firma-inventada`;
      const { ejecucion } = contexto(`Bearer ${falso}`);

      expect(() => guard.canActivate(ejecucion)).toThrow(UnauthorizedException);
    });

    it('[I] lo que emite el servicio lo acepta el propio guard: firmar y verificar usan el mismo algoritmo', () => {
      const emitido = (
        authService as unknown as {
          generarToken: (usuario: { _id: string; perfil: string }) => string;
        }
      ).generarToken({ _id: 'abc123', perfil: 'usuario' });
      const { ejecucion } = contexto(`Bearer ${emitido}`);

      expect(jwt.decode(emitido, { complete: true })!.header.alg).toBe('HS256');
      expect(guard.canActivate(ejecucion)).toBe(true);
    });
  });
});
