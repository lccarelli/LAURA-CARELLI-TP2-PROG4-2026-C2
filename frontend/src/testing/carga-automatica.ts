import { TestRequest } from '@angular/common/http/testing';
import { ESPERA_EN_VISTA_MS } from '../app/directivas/en-vista/en-vista';
import { simularObservador } from './observador';

export interface ListadoPaginado {
  pedir: (offset: number) => TestRequest;
  pedidos: () => TestRequest[];
  pagina: (desde: number, cantidad: number, hayMas: boolean) => object;
  cargados: () => number;
  botonVerMas: () => HTMLButtonElement | undefined;
  actualizar: () => Promise<void>;
}

export function pruebasDeCargaAutomatica(nombreDelListado: string, listado: ListadoPaginado) {
  const { pedir, pedidos, pagina, cargados, botonVerMas, actualizar } = listado;

  describe('carga automática al hacer scroll', () => {
    let observador: ReturnType<typeof simularObservador>;

    const esperar = () => vi.advanceTimersByTime(ESPERA_EN_VISTA_MS);
    const abrirConMas = async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
    };
    const fallar = async () => {
      observador.aparecer();
      esperar();
      pedir(10).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 500, statusText: 'Error' });
      await actualizar();
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      observador = simularObservador();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it(`[O] al quedarse a la vista el final de ${nombreDelListado} pide la página siguiente sin tocar el botón`, async () => {
      await abrirConMas();

      observador.aparecer();
      esperar();
      pedir(10).flush(pagina(11, 2, false));
      await actualizar();

      expect(cargados()).toBe(12);
    });

    it('[S] sigue cargando páginas mientras el final siga a la vista', async () => {
      await abrirConMas();

      observador.aparecer();
      esperar();
      pedir(10).flush(pagina(11, 10, true));
      await actualizar();
      observador.aparecer();
      esperar();
      pedir(20).flush(pagina(21, 5, false));
      await actualizar();

      expect(cargados()).toBe(25);
    });

    it('[O] antes de cargar, el botón Ver más se alcanza a ver', async () => {
      await abrirConMas();

      vi.advanceTimersByTime(ESPERA_EN_VISTA_MS - 1);

      expect(botonVerMas()).toBeDefined();
      expect(pedidos()).toHaveLength(0);
    });

    it('[B] cuando no hay más páginas no queda nada que observar', async () => {
      pedir(0).flush(pagina(1, 10, false));
      await actualizar();

      expect(observador.activos()).toHaveLength(0);
    });

    it('[S] el botón sigue funcionando con un clic', async () => {
      await abrirConMas();

      botonVerMas()!.click();

      expect(pedidos()).toHaveLength(1);
    });

    it('[E] si la carga falla no insiste sola: espera el clic', async () => {
      await abrirConMas();
      await fallar();

      observador.aparecer();
      esperar();

      expect(pedidos()).toHaveLength(0);
      expect(botonVerMas()).toBeDefined();
    });

    it('[E] después de un error, el clic vuelve a pedir y retoma la carga automática', async () => {
      await abrirConMas();
      await fallar();

      botonVerMas()!.click();
      pedir(10).flush(pagina(11, 10, true));
      await actualizar();
      observador.aparecer();
      esperar();

      expect(pedidos()).toHaveLength(1);
    });
  });
}
