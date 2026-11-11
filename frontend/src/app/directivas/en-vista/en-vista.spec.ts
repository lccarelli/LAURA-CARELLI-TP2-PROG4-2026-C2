import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { simularObservador } from '../../../testing/observador';
import { EnVista, ESPERA_EN_VISTA_MS } from './en-vista';

@Component({
  imports: [EnVista],
  template: `@if (visible()) {
    <button appEnVista [activa]="activo()" (permanece)="veces = veces + 1">Más</button>
  }`,
})
class Anfitrion {
  veces = 0;
  readonly visible = signal(true);
  readonly activo = signal(true);
}

describe('EnVista', () => {
  let observador: ReturnType<typeof simularObservador>;

  async function crear() {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    return fixture;
  }

  const esperar = (ms = ESPERA_EN_VISTA_MS) => vi.advanceTimersByTime(ms);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    observador = simularObservador();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('[Z] mientras el elemento no aparece en pantalla no avisa', async () => {
    const fixture = await crear();

    observador.desaparecer();
    esperar();

    expect(fixture.componentInstance.veces).toBe(0);
  });

  it('[O] si el elemento queda a la vista, avisa una sola vez después de la espera', async () => {
    const fixture = await crear();

    observador.aparecer();
    esperar(ESPERA_EN_VISTA_MS - 1);
    expect(fixture.componentInstance.veces).toBe(0);

    esperar(1);
    esperar(5000);
    expect(fixture.componentInstance.veces).toBe(1);
  });

  it('[B] si se va de la pantalla antes de la espera, no avisa', async () => {
    const fixture = await crear();

    observador.aparecer();
    esperar(ESPERA_EN_VISTA_MS - 1);
    observador.desaparecer();
    esperar(5000);

    expect(fixture.componentInstance.veces).toBe(0);
  });

  it('[S] mientras espera, avisa que está esperando y lo deja de estar al cumplirse', async () => {
    const fixture = await crear();
    const directiva = fixture.debugElement.query(By.directive(EnVista)).injector.get(EnVista);
    expect(directiva.esperando()).toBe(false);

    observador.aparecer();
    expect(directiva.esperando()).toBe(true);
    esperar();

    expect(directiva.esperando()).toBe(false);
  });

  it('[B] si está desactivada no avisa aunque el elemento aparezca', async () => {
    const fixture = await crear();
    fixture.componentInstance.activo.set(false);
    await fixture.whenStable();

    observador.aparecer();
    esperar();

    expect(fixture.componentInstance.veces).toBe(0);
  });

  it('[S] al volver a activarse, vuelve a avisar', async () => {
    const fixture = await crear();
    fixture.componentInstance.activo.set(false);
    await fixture.whenStable();
    fixture.componentInstance.activo.set(true);
    await fixture.whenStable();

    observador.aparecer();
    esperar();

    expect(fixture.componentInstance.veces).toBe(1);
  });

  it('[I] al quitarse el elemento deja de observar', async () => {
    const fixture = await crear();
    expect(observador.activos()).toHaveLength(1);

    observador.aparecer();
    fixture.componentInstance.visible.set(false);
    await fixture.whenStable();
    esperar();

    expect(observador.activos()).toHaveLength(0);
    expect(fixture.componentInstance.veces).toBe(0);
  });

  it('[E] en un navegador sin IntersectionObserver no falla', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('IntersectionObserver', undefined);

    const fixture = await crear();

    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });
});
