import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../testing/idioma';
import { Idioma } from '../servicios/idioma/idioma';
import { Edad } from './edad';

describe('Edad', () => {
  let pipe: Edad;

  const el = (anio: number, mes: number, dia: number) => new Date(anio, mes - 1, dia, 12);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [proveerIdiomaDePrueba(), Edad] });
    pipe = TestBed.inject(Edad);
  });

  it('[O] calcula los años cumplidos desde la fecha que llega de la API', () => {
    expect(pipe.transform('1990-05-20T00:00:00.000Z', el(2026, 11, 15))).toBe('36 años');
  });

  it.each([
    ['la víspera del cumpleaños todavía no cumplió', el(2026, 5, 19), '35 años'],
    ['el día del cumpleaños ya cumplió', el(2026, 5, 20), '36 años'],
    ['el día siguiente sigue con los mismos años', el(2026, 5, 21), '36 años'],
    ['un mes antes del cumpleaños no cumplió', el(2026, 4, 30), '35 años'],
    ['un mes después ya cumplió', el(2026, 6, 1), '36 años'],
  ])('[B] %s', (_caso, hoy, esperado) => {
    expect(pipe.transform('1990-05-20T00:00:00.000Z', hoy)).toBe(esperado);
  });

  it('[B] quien nació el 29 de febrero cumple el 1 de marzo en un año común', () => {
    expect(pipe.transform('2000-02-29T00:00:00.000Z', el(2026, 2, 28))).toBe('25 años');
    expect(pipe.transform('2000-02-29T00:00:00.000Z', el(2026, 3, 1))).toBe('26 años');
    expect(pipe.transform('2000-02-29T00:00:00.000Z', el(2028, 2, 29))).toBe('28 años');
  });

  it('[B] un bebé de menos de un año tiene 0 años', () => {
    expect(pipe.transform('2026-03-01T00:00:00.000Z', el(2026, 11, 15))).toBe('0 años');
  });

  it('[B] con exactamente un año usa el singular', () => {
    expect(pipe.transform('2025-11-15T00:00:00.000Z', el(2026, 11, 15))).toBe('1 año');
  });

  it('[I] el cumpleaños se cuenta por el día del calendario, sin depender de la zona horaria', () => {
    expect(pipe.transform('1990-05-20', el(2026, 5, 20))).toBe('36 años');
    expect(pipe.transform(new Date(Date.UTC(1990, 4, 20)), el(2026, 5, 19))).toBe('35 años');
  });

  it.each([
    ['sin fecha', undefined],
    ['fecha nula', null],
    ['texto vacío', ''],
    ['texto que no es fecha', 'ayer'],
    ['una fecha en el futuro', '2099-01-01T00:00:00.000Z'],
  ])('[E] %s devuelve texto vacío', (_caso, nacimiento) => {
    expect(pipe.transform(nacimiento, el(2026, 11, 15))).toBe('');
  });

  it('[S] al cambiar de idioma el mismo pipe responde en inglés', () => {
    TestBed.inject(Idioma).cambiar('en');

    expect(pipe.transform('1990-05-20T00:00:00.000Z', el(2026, 11, 15))).toBe('36 years');
    expect(pipe.transform('2025-11-15T00:00:00.000Z', el(2026, 11, 15))).toBe('1 year');
  });
});
