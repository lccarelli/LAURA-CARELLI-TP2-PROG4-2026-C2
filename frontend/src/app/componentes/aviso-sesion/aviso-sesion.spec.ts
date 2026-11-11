import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Sesion } from '../../servicios/sesion/sesion';
import { AvisoSesion } from './aviso-sesion';

describe('AvisoSesion', () => {
  const segundosRestantes = signal<number | null>(300);
  const extendiendo = signal(false);
  const extender = vi.fn();
  const cerrar = vi.fn();

  async function crear(idioma = 'es') {
    await TestBed.configureTestingModule({
      imports: [AvisoSesion],
      providers: [
        proveerIdiomaDePrueba(idioma),
        { provide: Sesion, useValue: { segundosRestantes, extendiendo, extender, cerrar } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AvisoSesion);
    await fixture.whenStable();
    return fixture;
  }

  const raiz = (fixture: Awaited<ReturnType<typeof crear>>) => fixture.nativeElement as HTMLElement;
  const boton = (fixture: Awaited<ReturnType<typeof crear>>, posicion: number) =>
    raiz(fixture).querySelectorAll('button')[posicion];

  beforeEach(() => {
    segundosRestantes.set(300);
    extendiendo.set(false);
    extender.mockReset();
    cerrar.mockReset();
  });

  it('[O] es un diálogo modal con título y el tiempo que queda', async () => {
    const fixture = await crear();

    const dialogo = raiz(fixture).querySelector('[role="alertdialog"]');
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.textContent).toContain('Tu sesión está por vencer');
    expect(dialogo?.textContent).toContain('está por cerrarse');
    expect(dialogo?.textContent?.match(/5:00/g)).toHaveLength(1);
  });

  it.each([
    [300, '5:00'],
    [61, '1:01'],
    [59, '0:59'],
    [5, '0:05'],
  ])('[B] con %i segundos muestra %s', async (segundos, esperado) => {
    segundosRestantes.set(segundos);

    const fixture = await crear();

    expect(raiz(fixture).querySelector('.modal-tiempo')?.textContent).toBe(esperado);
  });

  it('[S] la cuenta regresiva se actualiza sola', async () => {
    const fixture = await crear();

    segundosRestantes.set(299);
    await fixture.whenStable();

    expect(raiz(fixture).querySelector('.modal-tiempo')?.textContent).toBe('4:59');
  });

  it('[O] el botón principal extiende la sesión', async () => {
    const fixture = await crear();

    boton(fixture, 1).click();

    expect(boton(fixture, 1).textContent).toContain('Extender sesión');
    expect(extender).toHaveBeenCalledTimes(1);
  });

  it('[O] el botón secundario cierra la sesión', async () => {
    const fixture = await crear();

    boton(fixture, 0).click();

    expect(boton(fixture, 0).textContent).toContain('Cerrar sesión');
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('[S] mientras extiende, el botón se deshabilita y lo dice', async () => {
    extendiendo.set(true);

    const fixture = await crear();

    expect(boton(fixture, 1).disabled).toBe(true);
    expect(boton(fixture, 1).textContent).toContain('Extendiendo…');
  });

  it('[I] se muestra en inglés', async () => {
    const fixture = await crear('en');

    expect(raiz(fixture).textContent).toContain('Your session is about to expire');
    expect(boton(fixture, 1).textContent).toContain('Extend session');
  });
});
