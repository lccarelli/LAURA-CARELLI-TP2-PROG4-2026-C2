import { FormControl, FormGroup } from '@angular/forms';
import { PATRON_CLAVE, PATRON_NOMBRE_USUARIO, clavesIguales, fechaPasada } from './validadores';

describe('clavesIguales', () => {
  const grupo = (clave: string, repetirClave: string) =>
    new FormGroup({
      clave: new FormControl(clave),
      repetirClave: new FormControl(repetirClave),
    });

  it('[Z] con los dos campos vacíos no marca error', () => {
    expect(clavesIguales(grupo('', ''))).toBeNull();
  });

  it('[O] con claves iguales no marca error', () => {
    expect(clavesIguales(grupo('Clave1234', 'Clave1234'))).toBeNull();
  });

  it('[B] con claves que difieren en un solo carácter marca error', () => {
    expect(clavesIguales(grupo('Clave1234', 'Clave1235'))).toEqual({
      clavesDistintas: true,
    });
  });

  it('[E] con un solo campo vacío marca error', () => {
    expect(clavesIguales(grupo('Clave1234', ''))).toEqual({
      clavesDistintas: true,
    });
  });
});

describe('PATRON_CLAVE', () => {
  it('[B] 7 caracteres no cumple y 8 sí', () => {
    expect(PATRON_CLAVE.test('Clave12')).toBe(false);
    expect(PATRON_CLAVE.test('Clave123')).toBe(true);
  });

  it('[B] 12 caracteres cumple y 13 no', () => {
    expect(PATRON_CLAVE.test('Clave1' + 'a'.repeat(6))).toBe(true);
    expect(PATRON_CLAVE.test('Clave1' + 'a'.repeat(7))).toBe(false);
  });

  it('[B] sin mayúscula o sin número no cumple', () => {
    expect(PATRON_CLAVE.test('clave1234')).toBe(false);
    expect(PATRON_CLAVE.test('ClaveClave')).toBe(false);
  });
});

describe('PATRON_NOMBRE_USUARIO', () => {
  it('[B] 2 caracteres no cumple, 3 y 20 sí, 21 no', () => {
    expect(PATRON_NOMBRE_USUARIO.test('ab')).toBe(false);
    expect(PATRON_NOMBRE_USUARIO.test('abc')).toBe(true);
    expect(PATRON_NOMBRE_USUARIO.test('a'.repeat(20))).toBe(true);
    expect(PATRON_NOMBRE_USUARIO.test('a'.repeat(21))).toBe(false);
  });

  it('[I] no admite arroba ni espacios', () => {
    expect(PATRON_NOMBRE_USUARIO.test('laura@c')).toBe(false);
    expect(PATRON_NOMBRE_USUARIO.test('laura c')).toBe(false);
  });
});

describe('fechaPasada', () => {
  const validar = (valor: string) => fechaPasada(new FormControl(valor));

  it('[Z] sin fecha no marca error, de eso se ocupa required', () => {
    expect(validar('')).toBeNull();
  });

  it('[O] una fecha pasada no marca error', () => {
    expect(validar('1990-05-20')).toBeNull();
  });

  it('[B] ayer no marca error y mañana sí', () => {
    const dia = 24 * 60 * 60 * 1000;
    const ayer = new Date(Date.now() - dia).toISOString().slice(0, 10);
    const manana = new Date(Date.now() + dia).toISOString().slice(0, 10);

    expect(validar(ayer)).toBeNull();
    expect(validar(manana)).toEqual({ fechaFutura: true });
  });
});
