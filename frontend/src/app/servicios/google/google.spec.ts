import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import {
  ANCHO_MAXIMO_BOTON,
  ANCHO_MINIMO_BOTON,
  ANCHO_SI_NO_SE_PUEDE_MEDIR,
  Google,
} from './google';

type Inicializar = (config: google.accounts.id.IdConfiguration) => void;

describe('Google', () => {
  let inicializar: ReturnType<typeof vi.fn<Inicializar>>;
  let dibujar: ReturnType<
    typeof vi.fn<(parent: HTMLElement, opciones: google.accounts.id.GsiButtonConfiguration) => void>
  >;

  const crear = (clientId: string) => {
    environment.GOOGLE_CLIENT_ID = clientId;
    TestBed.configureTestingModule({ providers: [proveerIdiomaDePrueba()] });
    return TestBed.inject(Google);
  };
  const scriptsDeGoogle = () =>
    Array.from(document.head.querySelectorAll('script')).filter((s) =>
      s.src.startsWith('https://accounts.google.com/gsi/client'),
    );
  const instalarSdk = () => {
    (globalThis as unknown as { google: unknown }).google = {
      accounts: { id: { initialize: inicializar, renderButton: dibujar } },
    };
  };

  beforeEach(() => {
    inicializar = vi.fn();
    dibujar = vi.fn();
    scriptsDeGoogle().forEach((s) => s.remove());
    delete (globalThis as { google?: unknown }).google;
  });

  afterEach(() => {
    environment.GOOGLE_CLIENT_ID = '';
    scriptsDeGoogle().forEach((s) => s.remove());
    delete (globalThis as { google?: unknown }).google;
  });

  describe('sin ID de cliente (por defecto)', () => {
    it('[Z] no está disponible y nunca descarga el SDK de Google', async () => {
      const servicio = crear('');

      expect(servicio.disponible).toBe(false);
      expect(await servicio.cargar()).toBe(false);
      expect(scriptsDeGoogle()).toHaveLength(0);
    });

    it('[Z] mostrarBoton no hace nada', async () => {
      const servicio = crear('');

      expect(await servicio.mostrarBoton(document.createElement('div'), vi.fn())).toBe(false);
    });
  });

  describe('con ID de cliente', () => {
    it('[O] descarga el SDK oficial de Google una sola vez, aunque se pida varias', async () => {
      const servicio = crear('mi-id.apps.googleusercontent.com');

      const primera = servicio.cargar();
      const segunda = servicio.cargar();
      expect(scriptsDeGoogle()).toHaveLength(1);
      scriptsDeGoogle()[0].onload!(new Event('load'));

      expect(await primera).toBe(true);
      expect(await segunda).toBe(true);
      expect(scriptsDeGoogle()[0].async).toBe(true);
    });

    it('[S] si el SDK ya estaba cargado no lo vuelve a descargar', async () => {
      instalarSdk();
      const servicio = crear('mi-id');

      expect(await servicio.cargar()).toBe(true);
      expect(scriptsDeGoogle()).toHaveLength(0);
    });

    it('[E] si no se puede descargar (sin internet, bloqueador), devuelve false y deja reintentar', async () => {
      const servicio = crear('mi-id');

      const intento = servicio.cargar();
      scriptsDeGoogle()[0].onerror!(new Event('error'));
      expect(await intento).toBe(false);

      void servicio.cargar();
      expect(scriptsDeGoogle()).toHaveLength(2);
    });

    it('[O] mostrarBoton inicializa con el ID de cliente y dibuja el botón oficial', async () => {
      instalarSdk();
      const servicio = crear('mi-id.apps.googleusercontent.com');
      const contenedor = document.createElement('div');

      const listo = await servicio.mostrarBoton(contenedor, vi.fn());

      expect(listo).toBe(true);
      expect(inicializar).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'mi-id.apps.googleusercontent.com',
          auto_select: false,
          ux_mode: 'popup',
        }),
      );
      expect(dibujar).toHaveBeenCalledWith(
        contenedor,
        expect.objectContaining({ text: 'continue_with', shape: 'pill', locale: 'es' }),
      );
    });

    it('[S] cuando Google devuelve la credencial, se la pasa a quien la pidió', async () => {
      instalarSdk();
      const servicio = crear('mi-id');
      const alRecibir = vi.fn();

      await servicio.mostrarBoton(document.createElement('div'), alRecibir);
      inicializar.mock.calls[0][0].callback?.({ credential: 'abc.def.ghi' } as never);

      expect(alRecibir).toHaveBeenCalledWith('abc.def.ghi');
    });

    it.each([
      [900, ANCHO_MAXIMO_BOTON],
      [400, 400],
      [280, 280],
      [200, ANCHO_MINIMO_BOTON],
      [120, ANCHO_MINIMO_BOTON],
    ])(
      '[B] con un contenedor de %i px el botón mide %i px (entre 200 y 400, que son los límites de Google)',
      async (disponible, esperado) => {
        instalarSdk();
        const servicio = crear('mi-id');
        const contenedor = document.createElement('div');
        Object.defineProperty(contenedor, 'clientWidth', { value: disponible });

        await servicio.mostrarBoton(contenedor, vi.fn());

        expect(dibujar.mock.calls[0][1].width).toBe(esperado);
      },
    );

    it('[S] si no se puede medir (ancho 0) usa un ancho chico y seguro, nunca el máximo: en un celular el máximo desborda la pantalla', async () => {
      instalarSdk();
      const servicio = crear('mi-id');

      await servicio.mostrarBoton(document.createElement('div'), vi.fn());

      expect(dibujar.mock.calls[0][1].width).toBe(ANCHO_SI_NO_SE_PUEDE_MEDIR);
      expect(ANCHO_SI_NO_SE_PUEDE_MEDIR).toBeLessThan(ANCHO_MAXIMO_BOTON);
    });

    it('[E] si no se pudo cargar el SDK, mostrarBoton devuelve false y no inicializa', async () => {
      const servicio = crear('mi-id');

      const resultado = servicio.mostrarBoton(document.createElement('div'), vi.fn());
      scriptsDeGoogle()[0].onerror!(new Event('error'));

      expect(await resultado).toBe(false);
      expect(inicializar).not.toHaveBeenCalled();
    });
  });
});
