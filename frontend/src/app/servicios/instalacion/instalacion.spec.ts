import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Auth } from '../auth/auth';
import { CLAVE_DECIDIDAS, Instalacion } from './instalacion';

const eventoDeInstalacion = (resultado: 'accepted' | 'dismissed' = 'accepted') => {
  const evento = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(evento, {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome: resultado }),
  });
};

describe('Instalacion', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

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
    const ingresarComo = (id: string) =>
      TestBed.inject(Auth).usuario.set({ ...usuarioDePrueba, _id: id });
    const preparar = (id = 'u1') => {
      simularCelular(true);
      simularIphone();
      const instalacion = crear();
      ingresarComo(id);
      return instalacion;
    };

    beforeEach(() => localStorage.clear());

    it('[Z] sin haber ingresado o creado la cuenta recién no se ofrece, aunque haya sesión', () => {
      const instalacion = preparar();

      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[O] justo después de ingresar o crear la cuenta, en un iPhone, se ofrece', () => {
      const instalacion = preparar();

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[O] justo después de ingresar, en Android con instalación nativa, se ofrece', () => {
      simularCelular(true);
      const instalacion = crear();
      ingresarComo('u1');
      window.dispatchEvent(eventoDeInstalacion());

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[Z] en la compu no se ofrece', () => {
      simularCelular(false);
      const instalacion = crear();
      ingresarComo('u1');
      window.dispatchEvent(eventoDeInstalacion());

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[Z] en un celular que no puede instalar (ni nativo ni iPhone) no se ofrece', () => {
      simularCelular(true);
      const instalacion = crear();
      ingresarComo('u1');

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[E] si la app ya está instalada no se ofrece', () => {
      simularCelular(true, true);
      simularIphone();
      const instalacion = crear();
      ingresarComo('u1');

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[E] sin persona con sesión no se ofrece', () => {
      simularCelular(true);
      simularIphone();
      const instalacion = crear();

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[S] al cerrarlo se guarda la decisión de esa persona y no se vuelve a preguntar nunca', () => {
      const primera = preparar();
      primera.ofrecerAlIngresar();

      primera.descartarCartel();

      expect(primera.mostrarCartel()).toBe(false);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      const otraVisita = preparar();
      otraVisita.ofrecerAlIngresar();
      expect(otraVisita.mostrarCartel()).toBe(false);
      expect(JSON.parse(localStorage.getItem(CLAVE_DECIDIDAS)!)).toEqual(['u1']);
    });

    it('[S] la decisión es de cada persona: otra que ingresa en el mismo dispositivo sí lo ve', () => {
      const instalacion = preparar('u1');
      instalacion.ofrecerAlIngresar();
      instalacion.descartarCartel();

      ingresarComo('u2');

      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[S] decidir dos veces no duplica la anotación', () => {
      const instalacion = preparar();

      instalacion.descartarCartel();
      instalacion.descartarCartel();

      expect(JSON.parse(localStorage.getItem(CLAVE_DECIDIDAS)!)).toEqual(['u1']);
    });

    it('[S] instalar desde el botón también cuenta como decisión', async () => {
      simularCelular(true);
      const instalacion = crear();
      ingresarComo('u1');
      window.dispatchEvent(eventoDeInstalacion('accepted'));
      instalacion.ofrecerAlIngresar();

      await instalacion.instalar();

      expect(JSON.parse(localStorage.getItem(CLAVE_DECIDIDAS)!)).toEqual(['u1']);
      expect(instalacion.mostrarCartel()).toBe(false);
    });

    it('[S] si se cierra el cartel nativo sin instalar, no se da por decidido', async () => {
      simularCelular(true);
      const instalacion = crear();
      ingresarComo('u1');
      window.dispatchEvent(eventoDeInstalacion('dismissed'));
      instalacion.ofrecerAlIngresar();

      await instalacion.instalar();

      expect(localStorage.getItem(CLAVE_DECIDIDAS)).toBeNull();
      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[S] si el sistema avisa que se instaló, queda decidido', () => {
      const instalacion = preparar();

      window.dispatchEvent(new Event('appinstalled'));

      expect(instalacion.mostrarCartel()).toBe(false);
      expect(JSON.parse(localStorage.getItem(CLAVE_DECIDIDAS)!)).toEqual(['u1']);
    });

    it('[E] si lo guardado está dañado se ignora y se ofrece', () => {
      localStorage.setItem(CLAVE_DECIDIDAS, 'esto no es json');
      const instalacion = preparar();

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[E] si lo guardado no es una lista se ignora y se ofrece', () => {
      localStorage.setItem(CLAVE_DECIDIDAS, '{"u1":true}');
      const instalacion = preparar();

      instalacion.ofrecerAlIngresar();

      expect(instalacion.mostrarCartel()).toBe(true);
    });

    it('[E] sin almacenamiento, cerrarlo igual lo oculta en esta visita', () => {
      const instalacion = preparar();
      instalacion.ofrecerAlIngresar();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('sin lugar');
      });

      instalacion.descartarCartel();

      expect(instalacion.mostrarCartel()).toBe(false);
      vi.restoreAllMocks();
    });
  });
});
