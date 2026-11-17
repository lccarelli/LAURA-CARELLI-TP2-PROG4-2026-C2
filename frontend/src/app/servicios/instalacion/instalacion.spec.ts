import { TestBed } from '@angular/core/testing';
import { Instalacion } from './instalacion';

const eventoDeInstalacion = (resultado: 'accepted' | 'dismissed' = 'accepted') => {
  const evento = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(evento, {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome: resultado }),
  });
};

describe('Instalacion', () => {
  const crear = () => {
    const instalacion = TestBed.inject(Instalacion);
    instalacion.iniciar();
    return instalacion;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('[Z] al principio no se puede instalar', () => {
    expect(crear().puedeInstalar()).toBe(false);
  });

  it('[O] cuando el navegador ofrece instalar, guarda el evento y evita el cartel propio', () => {
    const instalacion = crear();
    const evento = eventoDeInstalacion();

    window.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(instalacion.puedeInstalar()).toBe(true);
  });

  it('[S] instalar abre el cartel del navegador y, si se acepta, deja de ofrecerse', async () => {
    const instalacion = crear();
    const evento = eventoDeInstalacion('accepted');
    window.dispatchEvent(evento);

    await instalacion.instalar();

    expect(evento.prompt).toHaveBeenCalledTimes(1);
    expect(instalacion.puedeInstalar()).toBe(false);
  });

  it('[S] si se descarta el cartel, se puede volver a ofrecer', async () => {
    const instalacion = crear();
    window.dispatchEvent(eventoDeInstalacion('dismissed'));

    await instalacion.instalar();

    expect(instalacion.puedeInstalar()).toBe(true);
  });

  it('[S] al terminar la instalación queda como instalada', () => {
    const instalacion = crear();
    window.dispatchEvent(eventoDeInstalacion());

    window.dispatchEvent(new Event('appinstalled'));

    expect(instalacion.instalada()).toBe(true);
    expect(instalacion.puedeInstalar()).toBe(false);
  });

  it('[B] instalar sin que el navegador haya ofrecido nada no hace nada', async () => {
    const instalacion = crear();

    await instalacion.instalar();

    expect(instalacion.puedeInstalar()).toBe(false);
  });

  it('[O] abierta en modo app se reconoce como instalada', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    expect(TestBed.inject(Instalacion).instalada()).toBe(true);
  });
});
