import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { simularObservador } from '../../../testing/observador';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ESPERA_EN_VISTA_MS } from '../../directivas/en-vista/en-vista';
import { VerMas } from './ver-mas';

@Component({
  imports: [VerMas],
  template: `<app-ver-mas
    texto="publicaciones.ver_mas"
    [automatico]="automatico"
    (cargar)="veces = veces + 1"
  />`,
})
class Anfitrion {
  automatico = true;
  veces = 0;
}

describe('VerMas', () => {
  let observador: ReturnType<typeof simularObservador>;

  async function crear(automatico = true) {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.automatico = automatico;
    await fixture.whenStable();
    return fixture;
  }

  const raiz = (fixture: Awaited<ReturnType<typeof crear>>) => fixture.nativeElement as HTMLElement;
  const boton = (fixture: Awaited<ReturnType<typeof crear>>) =>
    raiz(fixture).querySelector('button') as HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    observador = simularObservador();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('[O] muestra el botón con su texto', async () => {
    const fixture = await crear();

    expect(boton(fixture).textContent).toContain('Ver más');
  });

  it('[O] un clic pide cargar', async () => {
    const fixture = await crear();

    boton(fixture).click();

    expect(fixture.componentInstance.veces).toBe(1);
  });

  it('[S] al quedar a la vista llena el botón y, pasada la espera, pide cargar', async () => {
    const fixture = await crear();

    observador.aparecer();
    fixture.detectChanges();
    expect(boton(fixture).classList.contains('esperando')).toBe(true);
    vi.advanceTimersByTime(ESPERA_EN_VISTA_MS);
    fixture.detectChanges();

    expect(fixture.componentInstance.veces).toBe(1);
    expect(boton(fixture).classList.contains('esperando')).toBe(false);
  });

  it('[B] si se va de la vista antes de la espera, el relleno se reinicia y no carga', async () => {
    const fixture = await crear();

    observador.aparecer();
    vi.advanceTimersByTime(ESPERA_EN_VISTA_MS - 1);
    observador.desaparecer();
    fixture.detectChanges();
    vi.advanceTimersByTime(ESPERA_EN_VISTA_MS);

    expect(boton(fixture).classList.contains('esperando')).toBe(false);
    expect(fixture.componentInstance.veces).toBe(0);
  });

  it('[E] sin carga automática no hay relleno, ni carga sola, pero el clic anda', async () => {
    const fixture = await crear(false);

    observador.aparecer();
    vi.advanceTimersByTime(ESPERA_EN_VISTA_MS);
    fixture.detectChanges();

    expect(boton(fixture).classList.contains('esperando')).toBe(false);
    expect(fixture.componentInstance.veces).toBe(0);
    boton(fixture).click();
    expect(fixture.componentInstance.veces).toBe(1);
  });

  it('[I] el relleno es sólo decoración: el lector de pantalla lo ignora', async () => {
    const fixture = await crear();

    expect(raiz(fixture).querySelector('.boton-ver-mas-relleno')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
