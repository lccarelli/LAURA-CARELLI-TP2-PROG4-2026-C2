import { TestBed } from '@angular/core/testing';
import { Carga, PERMANENCIA_MINIMA_MS, RETRASO_MS } from './carga';

describe('Carga', () => {
  let carga: Carga;

  beforeEach(() => {
    vi.useFakeTimers();
    carga = TestBed.inject(Carga);
  });

  afterEach(() => vi.useRealTimers());

  it('[Z] al principio no se muestra', () => {
    expect(carga.visible()).toBe(false);
  });

  it('[B] no aparece antes de 0,2 segundos, y sí a los 0,2', () => {
    carga.iniciar();

    vi.advanceTimersByTime(RETRASO_MS - 1);
    expect(carga.visible()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(carga.visible()).toBe(true);
  });

  it('[S] si la respuesta llega antes de 0,2 segundos nunca aparece (no hay destello)', () => {
    const id = carga.iniciar();

    vi.advanceTimersByTime(RETRASO_MS - 50);
    carga.terminar(id);
    vi.advanceTimersByTime(5000);

    expect(carga.visible()).toBe(false);
  });

  it('[S] una vez visible, se queda al menos 0,4 segundos para no parpadear', () => {
    const id = carga.iniciar();
    vi.advanceTimersByTime(RETRASO_MS);

    vi.advanceTimersByTime(100);
    carga.terminar(id);
    expect(carga.visible()).toBe(true);

    vi.advanceTimersByTime(PERMANENCIA_MINIMA_MS - 100 - 1);
    expect(carga.visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(carga.visible()).toBe(false);
  });

  it('[B] si ya pasó el tiempo mínimo, se oculta enseguida al terminar', () => {
    const id = carga.iniciar();
    vi.advanceTimersByTime(RETRASO_MS + PERMANENCIA_MINIMA_MS + 500);

    carga.terminar(id);
    vi.advanceTimersByTime(0);

    expect(carga.visible()).toBe(false);
  });

  it('[S] con varias esperas a la vez sigue visible hasta que termina la última', () => {
    const a = carga.iniciar();
    const b = carga.iniciar();
    vi.advanceTimersByTime(RETRASO_MS + PERMANENCIA_MINIMA_MS);

    carga.terminar(a);
    vi.advanceTimersByTime(1000);
    expect(carga.visible()).toBe(true);

    carga.terminar(b);
    vi.advanceTimersByTime(1);
    expect(carga.visible()).toBe(false);
  });

  it('[O] muestra el mensaje de la espera', () => {
    carga.iniciar({ clave: 'carga.ingresando' });

    expect(carga.mensaje()).toBe('carga.ingresando');
  });

  it('[I] con varias esperas muestra el mensaje específico y no el genérico', () => {
    carga.iniciar({ clave: 'carga.publicando' });
    carga.iniciar();

    expect(carga.mensaje()).toBe('carga.publicando');
  });

  it('[I] entre dos mensajes específicos muestra el último', () => {
    carga.iniciar({ clave: 'carga.publicando' });
    carga.iniciar({ clave: 'carga.trayendo_mas' });

    expect(carga.mensaje()).toBe('carga.trayendo_mas');
  });

  it('[O] la nota aparece después de los segundos indicados y no antes', () => {
    carga.iniciar({ clave: 'carga.ingresando', nota: 'carga.despertando', segundosHastaNota: 4 });
    vi.advanceTimersByTime(RETRASO_MS);

    vi.advanceTimersByTime(3799);
    expect(carga.nota()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(carga.nota()).toBe('carga.despertando');
  });

  it('[S] la nota de una espera que ya terminó no se queda para la siguiente', () => {
    const id = carga.iniciar({
      clave: 'carga.ingresando',
      nota: 'carga.despertando',
      segundosHastaNota: 4,
    });
    vi.advanceTimersByTime(5000);
    carga.terminar(id);
    vi.advanceTimersByTime(PERMANENCIA_MINIMA_MS);

    carga.iniciar();
    vi.advanceTimersByTime(RETRASO_MS);

    expect(carga.nota()).toBeNull();
    expect(carga.mensaje()).toBe('carga.cargando');
  });

  it('[S] una espera sin nota nunca muestra nota', () => {
    carga.iniciar({ clave: 'carga.eliminando' });
    vi.advanceTimersByTime(60000);

    expect(carga.nota()).toBeNull();
  });

  it('[E] terminar una espera que no existe no hace nada', () => {
    carga.terminar(999);

    expect(carga.visible()).toBe(false);
  });

  it('[S] si llega una espera mientras se estaba por ocultar, no se oculta', () => {
    const a = carga.iniciar();
    vi.advanceTimersByTime(RETRASO_MS + 100);
    carga.terminar(a);

    carga.iniciar();
    vi.advanceTimersByTime(PERMANENCIA_MINIMA_MS * 2);

    expect(carga.visible()).toBe(true);
  });
});
