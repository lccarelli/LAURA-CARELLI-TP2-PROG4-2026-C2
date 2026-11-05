import { LoggerFactory } from './logs.factory.js';

describe('LoggerFactory', () => {
  const fabrica = new LoggerFactory();
  const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const primera = () => JSON.parse(String(salida.mock.calls[0][0]));

  beforeEach(() => {
    salida.mockClear();
  });

  it('[Z] el logger creado escribe con el módulo que se le pidió', () => {
    fabrica.crear('AuthGuard').info('ingreso_correcto', 'Ingreso correcto');

    expect(primera()).toMatchObject({
      nivel: 'info',
      modulo: 'AuthGuard',
      evento: 'ingreso_correcto',
      mensaje: 'Ingreso correcto',
    });
  });

  it('[O] advertir escribe con nivel warn', () => {
    fabrica.crear('AuthGuard').advertir('token_ausente', 'Sin token');

    expect(primera().nivel).toBe('warn');
  });

  it('[M] error escribe con nivel error', () => {
    fabrica.crear('AuthGuard').error('falla', 'Se rompió');

    expect(primera().nivel).toBe('error');
  });

  it('[B] suma los campos propios del evento', () => {
    fabrica.crear('AuthGuard').info('x', 'y', { id_usuario: 'abc123' });

    expect(primera().id_usuario).toBe('abc123');
  });

  it('[I] dos loggers de distintas clases no se pisan el módulo', () => {
    fabrica.crear('A').info('x', 'y');
    fabrica.crear('B').info('x', 'y');

    expect(
      salida.mock.calls.map(([l]) => JSON.parse(String(l)).modulo),
    ).toEqual(['A', 'B']);
  });

  it('[E] registrar acepta el nivel como parámetro', () => {
    fabrica.crear('AuthGuard').registrar('error', 'x', 'y');

    expect(primera().nivel).toBe('error');
  });
});
