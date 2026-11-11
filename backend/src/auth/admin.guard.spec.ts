import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { LoggerFactory } from '../logs/logs.factory.js';
import { AdminGuard } from './admin.guard.js';

function contexto(perfil: string) {
  const solicitud = {
    usuario: { id: 'abc123', perfil, inicio: 0 },
    method: 'GET',
    originalUrl: '/usuarios',
  };
  return {
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard(new LoggerFactory());

  it('[O] un administrador pasa', () => {
    expect(guard.canActivate(contexto('administrador'))).toBe(true);
  });

  it('[E] un usuario común responde 403 NO_ES_ADMINISTRADOR', () => {
    const intento = () => guard.canActivate(contexto('usuario'));

    expect(intento).toThrow(ForbiddenException);
    expect(intento).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ codigo: 'NO_ES_ADMINISTRADOR' }),
      }),
    );
  });

  it('[E] un perfil desconocido tampoco pasa', () => {
    expect(() => guard.canActivate(contexto(''))).toThrow(ForbiddenException);
  });

  it('[S] al rechazar registra quién intentó entrar y adónde', () => {
    const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    expect(() => guard.canActivate(contexto('usuario'))).toThrow(
      ForbiddenException,
    );
    const linea = JSON.parse(String(salida.mock.calls[0][0]));
    salida.mockRestore();
    expect(linea).toMatchObject({
      nivel: 'warn',
      modulo: 'AdminGuard',
      evento: 'acceso_denegado',
      usuarioId: 'abc123',
      metodo: 'GET',
      url: '/usuarios',
    });
  });
});
