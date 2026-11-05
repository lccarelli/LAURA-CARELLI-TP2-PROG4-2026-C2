import { LoggerGlobal, crearLog } from './logger-global.js';
import { ejecutarConContexto } from './id-solicitud.middleware.js';

const entrada = {
  nivel: 'info' as const,
  modulo: 'Auth',
  evento: 'ingreso_correcto',
  mensaje: 'Ingreso correcto',
};

describe('crearLog', () => {
  it('[Z] es una sola línea de JSON con los campos fijos', () => {
    const linea = crearLog(entrada);

    expect(linea).not.toContain('\n');
    expect(JSON.parse(linea)).toMatchObject({
      nivel: 'info',
      servicio: 'banquete',
      modulo: 'Auth',
      evento: 'ingreso_correcto',
      mensaje: 'Ingreso correcto',
    });
  });

  it('[O] la marca de tiempo es una fecha ISO', () => {
    const { timestamp } = JSON.parse(crearLog(entrada));

    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('[M] suma los campos propios del evento', () => {
    const linea = crearLog({
      ...entrada,
      campos: { id_usuario: 'abc123', latencia_ms: 12 },
    });

    expect(JSON.parse(linea)).toMatchObject({
      id_usuario: 'abc123',
      latencia_ms: 12,
    });
  });

  it('[B] dentro de una solicitud lleva su id de solicitud', () => {
    const linea = ejecutarConContexto({ idSolicitud: 'solicitud-1234' }, () =>
      crearLog(entrada),
    );

    expect(JSON.parse(linea).id_solicitud).toBe('solicitud-1234');
  });

  it('[I] fuera de una solicitud no lleva id de solicitud', () => {
    expect(JSON.parse(crearLog(entrada))).not.toHaveProperty('id_solicitud');
  });

  it('[E] un campo con valor indefinido no aparece', () => {
    const linea = crearLog({
      ...entrada,
      campos: { id_usuario: undefined },
    });

    expect(JSON.parse(linea)).not.toHaveProperty('id_usuario');
  });

  it('[S] los campos fijos siempre van antes que los propios', () => {
    const claves = Object.keys(
      JSON.parse(crearLog({ ...entrada, campos: { ip: '1.1.1.1' } })),
    );

    expect(claves).toEqual([
      'timestamp',
      'nivel',
      'servicio',
      'modulo',
      'evento',
      'mensaje',
      'ip',
    ]);
  });
});

describe('LoggerGlobal', () => {
  const logger = new LoggerGlobal();
  const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const primera = () => JSON.parse(String(salida.mock.calls[0][0]));

  beforeEach(() => {
    salida.mockClear();
  });

  it('[Z] un log de Nest sale con el mismo formato', () => {
    logger.log('Servidor listo', 'NestApplication');

    expect(primera()).toMatchObject({
      nivel: 'info',
      servicio: 'banquete',
      modulo: 'NestApplication',
      evento: 'sistema',
      mensaje: 'Servidor listo',
    });
  });

  it('[O] sin contexto el módulo es Nest', () => {
    logger.log('algo');

    expect(primera().modulo).toBe('Nest');
  });

  it('[M] una advertencia lleva el nivel warn', () => {
    logger.warn('cuidado', 'Modulo');

    expect(primera().nivel).toBe('warn');
  });

  it('[B] un error con pila de llamadas la guarda en un campo', () => {
    logger.error('falló', 'Error: falló\n    at x', 'ExceptionsHandler');

    expect(primera()).toMatchObject({
      nivel: 'error',
      modulo: 'ExceptionsHandler',
      pila: 'Error: falló\n    at x',
    });
  });

  it('[I] un mensaje que no es texto se guarda como JSON', () => {
    logger.log({ a: 1 }, 'Modulo');

    expect(primera().mensaje).toBe('{"a":1}');
  });

  it('[E] un fatal se registra como error', () => {
    logger.fatal('se cayó', 'Modulo');

    expect(primera().nivel).toBe('error');
  });
});
