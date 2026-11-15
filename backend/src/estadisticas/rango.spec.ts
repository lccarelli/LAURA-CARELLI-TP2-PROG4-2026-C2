import { rangoAnterior } from './rango.js';

describe('rangoAnterior', () => {
  it('[O] devuelve el lapso de igual largo que termina el día anterior', () => {
    expect(rangoAnterior('2026-03-08', '2026-03-14')).toEqual({
      desde: '2026-03-01',
      hasta: '2026-03-07',
    });
  });

  it('[B] un solo día tiene como anterior el día de antes', () => {
    expect(rangoAnterior('2026-03-10', '2026-03-10')).toEqual({
      desde: '2026-03-09',
      hasta: '2026-03-09',
    });
  });

  it('[B] cruza el cambio de mes y de año', () => {
    expect(rangoAnterior('2026-01-01', '2026-01-10')).toEqual({
      desde: '2025-12-22',
      hasta: '2025-12-31',
    });
  });

  it('[B] respeta el 29 de febrero de un año bisiesto', () => {
    expect(rangoAnterior('2024-03-01', '2024-03-03')).toEqual({
      desde: '2024-02-27',
      hasta: '2024-02-29',
    });
  });
});
