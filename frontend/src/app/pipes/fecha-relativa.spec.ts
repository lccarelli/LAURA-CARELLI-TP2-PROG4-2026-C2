import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../testing/idioma';
import { Idioma } from '../servicios/idioma/idioma';
import { FechaRelativa } from './fecha-relativa';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const AHORA = Date.parse('2026-11-15T15:00:00Z');

describe('FechaRelativa', () => {
  let pipe: FechaRelativa;

  const hace = (milisegundos: number) => pipe.transform(new Date(AHORA - milisegundos), AHORA);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [proveerIdiomaDePrueba(), FechaRelativa] });
    pipe = TestBed.inject(FechaRelativa);
  });

  it.each([
    ['hace un instante', 10 * SEGUNDO, 'ahora'],
    ['hace 1 minuto', 90 * SEGUNDO, 'hace 1 minuto'],
    ['hace 5 minutos', 5 * MINUTO, 'hace 5 minutos'],
    ['hace 1 hora', 61 * MINUTO, 'hace 1 hora'],
    ['hace 3 horas', 3 * HORA, 'hace 3 horas'],
    ['ayer', 30 * HORA, 'ayer'],
    ['hace 3 días', 3 * DIA, 'hace 3 días'],
    ['hace 2 semanas', 15 * DIA, 'hace 2 semanas'],
    ['hace 4 meses', 130 * DIA, 'hace 4 meses'],
    ['hace 2 años', 800 * DIA, 'hace 2 años'],
  ])('[I] %s', (_caso, diferencia, esperado) => {
    expect(hace(diferencia)).toBe(esperado);
  });

  it.each([
    ['44 segundos sigue siendo ahora', 44 * SEGUNDO, 'ahora'],
    ['45 segundos ya cuentan como un minuto', 45 * SEGUNDO, 'hace 1 minuto'],
    ['59 minutos todavía son minutos', 59 * MINUTO, 'hace 59 minutos'],
    ['60 minutos ya son una hora', 60 * MINUTO, 'hace 1 hora'],
    ['23 horas todavía son horas', 23 * HORA, 'hace 23 horas'],
    ['24 horas ya es ayer', 24 * HORA, 'ayer'],
    ['6 días todavía son días', 6 * DIA, 'hace 6 días'],
    ['7 días ya es la semana pasada', 7 * DIA, 'la semana pasada'],
    ['29 días todavía son semanas', 29 * DIA, 'hace 4 semanas'],
    ['30 días ya es el mes pasado', 30 * DIA, 'el mes pasado'],
    ['364 días todavía son meses', 364 * DIA, 'hace 12 meses'],
    ['365 días ya es el año pasado', 365 * DIA, 'el año pasado'],
  ])('[B] %s', (_caso, diferencia, esperado) => {
    expect(hace(diferencia)).toBe(esperado);
  });

  it('[S] una fecha un poco en el futuro, por la diferencia de reloj con el servidor, es ahora', () => {
    expect(pipe.transform(new Date(AHORA + 5 * MINUTO), AHORA)).toBe('ahora');
  });

  it('[O] acepta la fecha como texto ISO, como llega de la API', () => {
    expect(pipe.transform('2026-11-12T15:00:00Z', AHORA)).toBe('hace 3 días');
  });

  it.each([
    ['sin fecha', undefined],
    ['fecha nula', null],
    ['texto vacío', ''],
    ['texto que no es fecha', 'ayer'],
  ])('[E] %s devuelve texto vacío', (_caso, fecha) => {
    expect(pipe.transform(fecha, AHORA)).toBe('');
  });

  it('[S] al cambiar de idioma el mismo pipe responde en inglés, sin crear otro', () => {
    TestBed.inject(Idioma).cambiar('en');

    expect(hace(3 * DIA)).toBe('3 days ago');
    expect(hace(30 * HORA)).toBe('yesterday');
    expect(hace(10 * SEGUNDO)).toBe('now');
  });
});
