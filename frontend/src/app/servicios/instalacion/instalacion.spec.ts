import { TestBed } from '@angular/core/testing';
import { DIAS_SIN_INSISTIR, Instalacion } from './instalacion';

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

  describe('cartel para instalar', () => {
    const simularCelular = (celular: boolean, instalada = false) =>
      vi.stubGlobal('matchMedia', (consulta: string) => ({
        matches: consulta.includes('max-width') ? celular : instalada,
      }));
    const simularIphone = () =>
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      });

    beforeEach(() => localStorage.clear());

    it('[Z] en la compu no se ofrece, aunque el navegador permita instalar', () => {
      simularCelular(false);
      const instalacion = crear();

      window.dispatchEvent(eventoDeInstalacion());

      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[O] en un celular con instalación nativa (Android) se ofrece', () => {
      simularCelular(true);
      const instalacion = crear();

      window.dispatchEvent(eventoDeInstalacion());

      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[O] en un iPhone se ofrece con los pasos, porque no hay instalación nativa', () => {
      simularCelular(true);
      simularIphone();

      expect(crear().mostrarCartel()).toBe(true);
    });

    it('[Z] en un celular sin instalación posible (ni nativa ni iPhone) no se ofrece', () => {
      simularCelular(true);

      expect(crear().mostrarCartel()).toBe(false);
    });

    it('[E] si la app ya está instalada no se ofrece', () => {
      simularCelular(true, true);
      simularIphone();

      expect(crear().mostrarCartel()).toBe(false);
    });

    it('[S] al descartarlo desaparece y no vuelve en las visitas siguientes', () => {
      simularCelular(true);
      simularIphone();
      const primera = crear();

      primera.descartarCartel();

      expect(primera.mostrarCartel()).toBe(false);
      TestBed.resetTestingModule();
      expect(crear().mostrarCartel()).toBe(false);
    });

    it('[B] a los 14 días vuelve a ofrecerse, y justo antes todavía no', () => {
      simularCelular(true);
      simularIphone();
      const quinceDias = (dias: number) => String(Date.now() - dias * 24 * 60 * 60 * 1000);

      localStorage.setItem('instalacion:descartado', quinceDias(DIAS_SIN_INSISTIR - 1));
      expect(crear().mostrarCartel()).toBe(false);

      TestBed.resetTestingModule();
      localStorage.setItem('instalacion:descartado', quinceDias(DIAS_SIN_INSISTIR + 1));
      expect(crear().mostrarCartel()).toBe(true);
    });

    it('[E] si no hay almacenamiento, descartar igual lo oculta en esta visita', () => {
      simularCelular(true);
      simularIphone();
      const instalacion = crear();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('sin lugar');
      });

      instalacion.descartarCartel();

      expect(instalacion.mostrarCartel()).toBe(false);
      vi.restoreAllMocks();
    });

    it('[S] al terminar la instalación desaparece', () => {
      simularCelular(true);
      const instalacion = crear();
      window.dispatchEvent(eventoDeInstalacion());

      window.dispatchEvent(new Event('appinstalled'));

      expect(instalacion.mostrarCartel()).toBe(false);
    });
  });
});
