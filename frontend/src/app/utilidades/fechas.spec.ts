import { diasDelRango, hoyEnBuenosAires, sumarDias } from './fechas';

describe('hoyEnBuenosAires', () => {
  it('[O] a mediodía UTC devuelve el mismo día', () => {
    expect(hoyEnBuenosAires(new Date('2026-03-31T12:00:00Z'))).toBe('2026-03-31');
  });

  it('[B] a las 02:59 UTC todavía es el día anterior en Buenos Aires', () => {
    expect(hoyEnBuenosAires(new Date('2026-04-01T02:59:59Z'))).toBe('2026-03-31');
  });

  it('[B] a las 03:00 UTC empieza el día en Buenos Aires', () => {
    expect(hoyEnBuenosAires(new Date('2026-04-01T03:00:00Z'))).toBe('2026-04-01');
  });
});

describe('sumarDias', () => {
  it('[O] suma días dentro del mes', () => {
    expect(sumarDias('2026-03-10', 5)).toBe('2026-03-15');
  });

  it('[B] cruza el fin de mes y de año', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('[B] respeta el 29 de febrero de un año bisiesto', () => {
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('[O] resta días con un valor negativo', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('[Z] sumar cero no cambia la fecha', () => {
    expect(sumarDias('2026-03-10', 0)).toBe('2026-03-10');
  });
});

describe('diasDelRango', () => {
  it('[B] un solo día cuenta uno', () => {
    expect(diasDelRango('2026-03-10', '2026-03-10')).toBe(1);
  });

  it('[O] cuenta los dos extremos', () => {
    expect(diasDelRango('2026-03-01', '2026-03-31')).toBe(31);
  });

  it('[B] un año completo con bisiesto son 366 días', () => {
    expect(diasDelRango('2028-01-01', '2028-12-31')).toBe(366);
  });
});
