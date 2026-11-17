import {
  claveAleatoria,
  CORREO_DOCENTE_POR_DEFECTO,
  datosDeLaCuentaDocente,
} from './cuenta-docente.js';

const PATRON_CLAVE = /^(?=.*[A-Z])(?=.*\d).{8,12}$/;

describe('claveAleatoria', () => {
  it.each(Array.from({ length: 50 }, (_, i) => [i + 1]))(
    '[O] la clave %i cumple las reglas de la aplicación (8 a 12, mayúscula y número)',
    () => {
      expect(claveAleatoria()).toMatch(PATRON_CLAVE);
    },
  );

  it('[I] dos claves seguidas no son iguales', () => {
    expect(claveAleatoria()).not.toBe(claveAleatoria());
  });
});

describe('datosDeLaCuentaDocente', () => {
  it('[Z] sin nada configurado usa el correo por defecto y una clave generada válida', () => {
    const datos = datosDeLaCuentaDocente({});

    expect(datos.correo).toBe(CORREO_DOCENTE_POR_DEFECTO);
    expect(datos.nombreUsuario).toBe('docente');
    expect(datos.clave).toMatch(PATRON_CLAVE);
  });

  it('[O] toma el correo de la variable que activa el botón, así los dos coinciden', () => {
    const datos = datosDeLaCuentaDocente({
      ACCESO_DOCENTE_CORREO: 'otra@cuenta.com',
    });

    expect(datos.correo).toBe('otra@cuenta.com');
  });

  it('[O] usa la clave indicada si es válida', () => {
    expect(datosDeLaCuentaDocente({ DOCENTE_CLAVE: 'ClaveUsada1' }).clave).toBe(
      'ClaveUsada1',
    );
  });

  it.each([
    ['de 13 caracteres', 'ClaveUsada123', 'clave'],
    ['sin número', 'ClaveUsadaX', 'clave'],
    ['sin mayúscula', 'claveusada1', 'clave'],
    ['de menos de 8', 'Clave1', 'clave'],
  ])(
    '[E] una clave %s se rechaza antes de crear una cuenta que no podría ingresar',
    (_caso, clave, campo) => {
      expect(() => datosDeLaCuentaDocente({ DOCENTE_CLAVE: clave })).toThrow(
        campo,
      );
    },
  );

  it('[E] un correo inválido se rechaza', () => {
    expect(() =>
      datosDeLaCuentaDocente({ ACCESO_DOCENTE_CORREO: 'no-es-un-correo' }),
    ).toThrow('correo');
  });

  it('[B] el correo por defecto entra en el máximo de 30 caracteres', () => {
    expect(CORREO_DOCENTE_POR_DEFECTO.length).toBeLessThanOrEqual(30);
  });
});
