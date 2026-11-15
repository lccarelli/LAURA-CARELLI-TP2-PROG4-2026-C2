import { rangoAnterior } from './rango.js';

describe('rangoAnterior', () => {
  it.each([
    [
      'devuelve el lapso de igual largo que termina el día anterior',
      '2026-03-08',
      '2026-03-14',
      '2026-03-01',
      '2026-03-07',
    ],
    [
      'un solo día tiene como anterior el día de antes',
      '2026-03-10',
      '2026-03-10',
      '2026-03-09',
      '2026-03-09',
    ],
    [
      'cruza el cambio de mes y de año',
      '2026-01-01',
      '2026-01-10',
      '2025-12-22',
      '2025-12-31',
    ],
    [
      'respeta el 29 de febrero de un año bisiesto',
      '2024-03-01',
      '2024-03-03',
      '2024-02-27',
      '2024-02-29',
    ],
  ])('[B] %s', (_caso, desde, hasta, anteriorDesde, anteriorHasta) => {
    expect(rangoAnterior(desde, hasta)).toEqual({
      desde: anteriorDesde,
      hasta: anteriorHasta,
    });
  });
});
