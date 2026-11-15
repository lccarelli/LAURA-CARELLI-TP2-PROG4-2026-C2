import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { graficos } from '../../../testing/chart-falso';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { DashboardEstadisticas } from './dashboard-estadisticas';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

const URL = `${environment.API_URL}/estadisticas/publicaciones-por-usuario`;
const URL_COMENTARIOS = `${environment.API_URL}/estadisticas/comentarios-por-dia`;
const URL_RANKING = `${environment.API_URL}/estadisticas/comentarios-por-publicacion`;
const URL_TIPOS = `${environment.API_URL}/estadisticas/publicaciones-por-tipo`;
const URL_RESUMEN = `${environment.API_URL}/estadisticas/resumen`;
const LAURA = { usuario: 'u1', nombreUsuario: 'laura_c', cantidad: 3 };
const JUAN = { usuario: 'u2', nombreUsuario: 'juan_p', cantidad: 1 };
const totales = (
  desde: string,
  hasta: string,
  [publicaciones, comentarios, personasActivas]: number[],
) => ({
  desde,
  hasta,
  publicaciones,
  comentarios,
  personasActivas,
});
const RESUMEN = {
  actual: totales('2026-03-02', '2026-03-31', [8, 20, 5]),
  anterior: totales('2026-01-31', '2026-03-01', [4, 25, 5]),
};

describe('DashboardEstadisticas', () => {
  let fixture: ComponentFixture<DashboardEstadisticas>;
  let http: HttpTestingController;

  const pedidos = () => http.match((solicitud) => solicitud.url === URL);
  const pedir = (desde: string, hasta: string) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL &&
        solicitud.params.get('desde') === desde &&
        solicitud.params.get('hasta') === hasta,
    );
  const pedirComentarios = (desde: string, hasta: string) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL_COMENTARIOS &&
        solicitud.params.get('desde') === desde &&
        solicitud.params.get('hasta') === hasta,
    );
  const pedirRanking = (desde: string, hasta: string) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL_RANKING &&
        solicitud.params.get('desde') === desde &&
        solicitud.params.get('hasta') === hasta,
    );
  const pedirTipos = (desde: string, hasta: string) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL_TIPOS &&
        solicitud.params.get('desde') === desde &&
        solicitud.params.get('hasta') === hasta,
    );
  const pedirResumen = (desde: string, hasta: string) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL_RESUMEN &&
        solicitud.params.get('desde') === desde &&
        solicitud.params.get('hasta') === hasta,
    );
  const resumenPedidos = () => http.match((solicitud) => solicitud.url === URL_RESUMEN);
  const tiposPedidos = () => http.match((solicitud) => solicitud.url === URL_TIPOS);
  const rankingPedidos = () => http.match((solicitud) => solicitud.url === URL_RANKING);
  const comentariosPedidos = () => http.match((solicitud) => solicitud.url === URL_COMENTARIOS);
  const lineas = () => fixture.nativeElement.querySelector('app-grafico-lineas');
  const texto = () => fixture.nativeElement.textContent as string;
  const campo = (indice: number) =>
    fixture.nativeElement.querySelectorAll('input[type="date"]')[indice] as HTMLInputElement;
  const grafico = () => fixture.nativeElement.querySelector('app-grafico-barras');
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const escribir = async (indice: number, valor: string) => {
    campo(indice).value = valor;
    campo(indice).dispatchEvent(new Event('change'));
    await actualizar();
  };
  const abrir = async (ahora: string) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(ahora));
    fixture = TestBed.createComponent(DashboardEstadisticas);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    graficos.length = 0;
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DashboardEstadisticas],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.useRealTimers());

  it('[I] al abrir pide los últimos 30 días hasta hoy', async () => {
    await abrir('2026-03-31T15:00:00Z');

    const solicitud = pedir('2026-03-02', '2026-03-31');

    expect(solicitud.request.method).toBe('GET');
    solicitud.flush([]);
  });

  it('[B] a las 22:00 de Buenos Aires el día de hoy todavía es el de Buenos Aires', async () => {
    await abrir('2026-04-01T01:00:00Z');

    const solicitud = pedir('2026-03-02', '2026-03-31');
    expect(solicitud.request.params.get('desde')).toBe('2026-03-02');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-31');
    solicitud.flush([]);
  });

  it('[O] los campos de fecha muestran el rango pedido', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    expect(campo(0).value).toBe('2026-03-02');
    expect(campo(1).value).toBe('2026-03-31');
  });

  it('[S] mientras carga muestra el cubreplato y no el gráfico', async () => {
    await abrir('2026-03-31T15:00:00Z');
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-cubreplato-loading')).not.toBeNull();
    expect(grafico()).toBeNull();
    pedir('2026-03-02', '2026-03-31').flush([]);
  });

  it('[O] con datos muestra el gráfico con una barra por persona', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([LAURA, JUAN]);
    pedirComentarios('2026-03-02', '2026-03-31').flush([]);
    pedirRanking('2026-03-02', '2026-03-31').flush([]);
    pedirTipos('2026-03-02', '2026-03-31').flush([]);
    pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
    await actualizar();
    await vi.waitFor(() => expect(graficos).toHaveLength(1));

    expect(graficos[0].config.data.labels).toEqual(['@laura_c', '@juan_p']);
    expect(graficos[0].config.data.datasets[0].data).toEqual([3, 1]);
    expect(fixture.nativeElement.querySelector('app-cubreplato-loading')).toBeNull();
  });

  it('[Z] sin publicaciones en el rango muestra el mensaje y no el gráfico', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    expect(texto()).toContain('No hay publicaciones en el rango elegido.');
    expect(grafico()).toBeNull();
  });

  it('[E] si la API falla muestra el aviso con el motivo y permite reintentar', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush(
      { codigo: 'NO_ES_ADMINISTRADOR' },
      { status: 403, statusText: 'Forbidden' },
    );
    await actualizar();

    expect(texto()).toContain('No pudimos cargar las estadísticas.');
    expect(texto()).toContain('Esta sección es sólo para administradores.');
    const reintentar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.includes('Reintentar'))!;
    reintentar.click();
    await actualizar();
    pedir('2026-03-02', '2026-03-31').flush([LAURA]);
    await actualizar();

    expect(texto()).not.toContain('No pudimos cargar las estadísticas.');
  });

  it('[O] al cambiar la fecha desde vuelve a pedir con el rango nuevo', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    await escribir(0, '2026-03-20');

    const solicitud = pedir('2026-03-20', '2026-03-31');
    expect(solicitud.request.params.get('desde')).toBe('2026-03-20');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-31');
    solicitud.flush([LAURA]);
  });

  it('[O] al cambiar la fecha hasta vuelve a pedir con el rango nuevo', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    await escribir(1, '2026-03-15');

    const solicitud = pedir('2026-03-02', '2026-03-15');
    expect(solicitud.request.params.get('desde')).toBe('2026-03-02');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-15');
    solicitud.flush([LAURA]);
  });

  it('[S] si cambia el rango con un pedido en curso, cancela el anterior', async () => {
    await abrir('2026-03-31T15:00:00Z');
    const primero = pedir('2026-03-02', '2026-03-31');

    await escribir(0, '2026-03-20');

    expect(primero.cancelled).toBe(true);
    pedir('2026-03-20', '2026-03-31').flush([]);
  });

  it('[B] desde igual a hasta es un rango válido de un día', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    await escribir(0, '2026-03-31');

    const solicitud = pedir('2026-03-31', '2026-03-31');
    expect(solicitud.request.params.get('desde')).toBe('2026-03-31');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-31');
    solicitud.flush([]);
  });

  it.each([
    [
      'desde posterior a hasta',
      0,
      '2026-04-05',
      'La fecha desde no puede ser posterior a la fecha hasta.',
    ],
    ['más de 366 días', 0, '2025-03-01', 'El rango no puede superar 366 días.'],
    ['una fecha borrada', 1, '', 'Elegí las dos fechas.'],
  ])('[E] con %s avisa y no pide', async (_caso, indice, valor, mensaje) => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    await escribir(indice, valor);

    expect(texto()).toContain(mensaje);
    expect(pedidos()).toHaveLength(0);
  });

  it('[B] un rango de justo 366 días se pide', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();

    await escribir(0, '2025-03-31');

    const solicitud = pedir('2025-03-31', '2026-03-31');
    expect(solicitud.request.params.get('desde')).toBe('2025-03-31');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-31');
    solicitud.flush([]);
  });

  it('[S] al corregir un rango inválido vuelve a pedir y el aviso desaparece', async () => {
    await abrir('2026-03-31T15:00:00Z');
    pedir('2026-03-02', '2026-03-31').flush([]);
    await actualizar();
    await escribir(0, '2026-04-05');

    await escribir(0, '2026-03-10');

    pedir('2026-03-10', '2026-03-31').flush([]);
    await actualizar();
    expect(texto()).not.toContain('no puede ser posterior');
  });

  it('[I] al salir de la pantalla cancela el pedido en curso', async () => {
    await abrir('2026-03-31T15:00:00Z');
    const solicitud = pedir('2026-03-02', '2026-03-31');

    fixture.destroy();

    expect(solicitud.cancelled).toBe(true);
  });

  describe('comentarios por día', () => {
    const DIAS = [
      { fecha: '2026-03-10', cantidad: 2 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 5 },
    ];
    const abrirConPublicaciones = async () => {
      await abrir('2026-03-31T15:00:00Z');
      pedir('2026-03-02', '2026-03-31').flush([]);
    };

    it('[I] al abrir pide los comentarios de los últimos 30 días hasta hoy', async () => {
      await abrirConPublicaciones();

      const solicitud = pedirComentarios('2026-03-02', '2026-03-31');

      expect(solicitud.request.method).toBe('GET');
      solicitud.flush([]);
    });

    it('[O] con datos dibuja la línea con un punto por día y las etiquetas en español', async () => {
      await abrirConPublicaciones();
      pedirComentarios('2026-03-02', '2026-03-31').flush(DIAS);
      await actualizar();
      await vi.waitFor(() => expect(graficos).toHaveLength(1));

      expect(graficos[0].config.type).toBe('line');
      expect(graficos[0].config.data.labels).toEqual(['10 mar', '11 mar', '12 mar']);
      expect(graficos[0].config.data.datasets[0].data).toEqual([2, 0, 5]);
    });

    it('[S] mientras cargan muestra el cubreplato y no la línea', async () => {
      await abrirConPublicaciones();
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-cubreplato-loading')).not.toBeNull();
      expect(lineas()).toBeNull();
      pedirComentarios('2026-03-02', '2026-03-31').flush([]);
    });

    it('[Z] si todos los días están en cero muestra el mensaje y no la línea', async () => {
      await abrirConPublicaciones();
      pedirComentarios('2026-03-02', '2026-03-31').flush([{ fecha: '2026-03-10', cantidad: 0 }]);
      await actualizar();

      expect(texto()).toContain('No hay comentarios en el rango elegido.');
      expect(lineas()).toBeNull();
    });

    it('[E] si falla muestra el aviso, y reintentar vuelve a pedir solo los comentarios', async () => {
      await abrirConPublicaciones();
      pedirComentarios('2026-03-02', '2026-03-31').flush(
        { codigo: 'NO_ES_ADMINISTRADOR' },
        { status: 403, statusText: 'Forbidden' },
      );
      await actualizar();

      expect(texto()).toContain('No pudimos cargar las estadísticas.');
      const reintentar = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent?.includes('Reintentar'))!;
      reintentar.click();
      await actualizar();

      expect(pedidos()).toHaveLength(0);
      pedirComentarios('2026-03-02', '2026-03-31').flush(DIAS);
      await actualizar();
      expect(texto()).not.toContain('No pudimos cargar las estadísticas.');
    });

    it('[S] si fallan las publicaciones, los comentarios se muestran igual', async () => {
      await abrir('2026-03-31T15:00:00Z');
      pedir('2026-03-02', '2026-03-31').flush({}, { status: 500, statusText: 'Error' });
      pedirComentarios('2026-03-02', '2026-03-31').flush(DIAS);
      await actualizar();
      await vi.waitFor(() => expect(graficos).toHaveLength(1));

      expect(lineas()).not.toBeNull();
    });

    it('[O] al cambiar la fecha vuelve a pedir los comentarios con el rango nuevo', async () => {
      await abrirConPublicaciones();
      pedirComentarios('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      await escribir(0, '2026-03-20');

      pedir('2026-03-20', '2026-03-31').flush([]);
      const solicitud = pedirComentarios('2026-03-20', '2026-03-31');
      expect(solicitud.request.params.get('desde')).toBe('2026-03-20');
      solicitud.flush([]);
    });

    it('[S] si cambia el rango con un pedido en curso, cancela el anterior', async () => {
      await abrirConPublicaciones();
      const primero = pedirComentarios('2026-03-02', '2026-03-31');

      await escribir(0, '2026-03-20');

      expect(primero.cancelled).toBe(true);
      pedir('2026-03-20', '2026-03-31').flush([]);
      pedirComentarios('2026-03-20', '2026-03-31').flush([]);
    });

    it('[E] con un rango inválido no pide comentarios', async () => {
      await abrirConPublicaciones();
      pedirComentarios('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      await escribir(0, '2026-04-05');

      expect(comentariosPedidos()).toHaveLength(0);
    });

    it('[I] al salir de la pantalla cancela el pedido en curso', async () => {
      await abrirConPublicaciones();
      const solicitud = pedirComentarios('2026-03-02', '2026-03-31');

      fixture.destroy();

      expect(solicitud.cancelled).toBe(true);
    });
  });

  describe('comentarios por publicación', () => {
    const LARGO = 'Milanesas de berenjena al horno con salsa de tomate casera';
    const FILAS = [
      { publicacion: 'p1', titulo: LARGO, cantidad: 7 },
      { publicacion: 'p2', titulo: 'Tarta', cantidad: 2 },
    ];
    const abrirConOtras = async () => {
      await abrir('2026-03-31T15:00:00Z');
      pedir('2026-03-02', '2026-03-31').flush([]);
      pedirComentarios('2026-03-02', '2026-03-31').flush([]);
    };

    it('[I] al abrir pide el ranking de los últimos 30 días hasta hoy', async () => {
      await abrirConOtras();

      const solicitud = pedirRanking('2026-03-02', '2026-03-31');

      expect(solicitud.request.method).toBe('GET');
      solicitud.flush([]);
    });

    it('[O] dibuja barras horizontales con los títulos largos cortados', async () => {
      await abrirConOtras();
      pedirRanking('2026-03-02', '2026-03-31').flush(FILAS);
      await actualizar();
      await vi.waitFor(() => expect(graficos).toHaveLength(1));

      const { type, data, options } = graficos[0].config;
      expect(type).toBe('bar');
      expect(options.indexAxis).toBe('y');
      expect(data.labels).toEqual(['Milanesas de berenjena al hor…', 'Tarta']);
      expect(data.datasets[0].data).toEqual([7, 2]);
    });

    it('[O] al pasar el mouse el tooltip muestra el título completo', async () => {
      await abrirConOtras();
      pedirRanking('2026-03-02', '2026-03-31').flush(FILAS);
      await actualizar();
      await vi.waitFor(() => expect(graficos).toHaveLength(1));

      const titulo = graficos[0].config.options.plugins!.tooltip!.callbacks.title!;

      expect(titulo([{ dataIndex: 0, label: 'cortado' }])).toBe(LARGO);
      expect(titulo([{ dataIndex: 1, label: 'Tarta' }])).toBe('Tarta');
    });

    it('[Z] sin publicaciones comentadas muestra el mensaje y no el gráfico', async () => {
      await abrirConOtras();
      pedirRanking('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      expect(texto()).toContain('No hay publicaciones con comentarios en el rango elegido.');
      expect(graficos).toHaveLength(0);
    });

    it('[E] si falla, Reintentar vuelve a pedir sólo el ranking', async () => {
      await abrirConOtras();
      pedirRanking('2026-03-02', '2026-03-31').flush({}, { status: 500, statusText: 'Error' });
      await actualizar();
      const reintentar = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent?.includes('Reintentar'))!;

      reintentar.click();
      await actualizar();

      expect(pedidos()).toHaveLength(0);
      expect(comentariosPedidos()).toHaveLength(0);
      pedirRanking('2026-03-02', '2026-03-31').flush(FILAS);
    });

    it('[O] al cambiar la fecha vuelve a pedir el ranking con el rango nuevo', async () => {
      await abrirConOtras();
      pedirRanking('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      await escribir(1, '2026-03-15');

      pedir('2026-03-02', '2026-03-15').flush([]);
      pedirComentarios('2026-03-02', '2026-03-15').flush([]);
      const solicitud = pedirRanking('2026-03-02', '2026-03-15');
      expect(solicitud.request.params.get('hasta')).toBe('2026-03-15');
      solicitud.flush([]);
    });

    it('[S] si cambia el rango con un pedido en curso, cancela el anterior', async () => {
      await abrirConOtras();
      const primero = pedirRanking('2026-03-02', '2026-03-31');

      await escribir(0, '2026-03-20');

      expect(primero.cancelled).toBe(true);
      pedir('2026-03-20', '2026-03-31').flush([]);
      pedirComentarios('2026-03-20', '2026-03-31').flush([]);
      pedirRanking('2026-03-20', '2026-03-31').flush([]);
    });

    it('[E] con un rango inválido no pide el ranking', async () => {
      await abrirConOtras();
      pedirRanking('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      await escribir(0, '2026-04-05');

      expect(rankingPedidos()).toHaveLength(0);
    });

    it('[I] al salir de la pantalla cancela el pedido en curso', async () => {
      await abrirConOtras();
      const solicitud = pedirRanking('2026-03-02', '2026-03-31');

      fixture.destroy();

      expect(solicitud.cancelled).toBe(true);
    });
  });

  describe('publicaciones por tipo', () => {
    const TIPOS = [
      { tipo: 'receta', cantidad: 4 },
      { tipo: 'tip', cantidad: 0 },
      { tipo: 'experiencia', cantidad: 2 },
    ];
    const abrirConOtras = async () => {
      await abrir('2026-03-31T15:00:00Z');
      pedir('2026-03-02', '2026-03-31').flush([]);
      pedirComentarios('2026-03-02', '2026-03-31').flush([]);
      pedirRanking('2026-03-02', '2026-03-31').flush([]);
    };

    it('[I] al abrir pide el reparto de los últimos 30 días hasta hoy', async () => {
      await abrirConOtras();

      const solicitud = pedirTipos('2026-03-02', '2026-03-31');

      expect(solicitud.request.method).toBe('GET');
      solicitud.flush([]);
    });

    it('[O] dibuja una torta con los nombres de los tipos en español', async () => {
      await abrirConOtras();
      pedirTipos('2026-03-02', '2026-03-31').flush(TIPOS);
      await actualizar();
      await vi.waitFor(() => expect(graficos).toHaveLength(1));

      const { type, data } = graficos[0].config;
      expect(type).toBe('pie');
      expect(data.labels).toEqual(['Receta', 'Tip culinario', 'Experiencia']);
      expect(data.datasets[0].data).toEqual([4, 0, 2]);
    });

    it('[Z] si todos los tipos están en cero muestra el mensaje y no la torta', async () => {
      await abrirConOtras();
      pedirTipos('2026-03-02', '2026-03-31').flush(TIPOS.map((fila) => ({ ...fila, cantidad: 0 })));
      await actualizar();

      expect(texto()).toContain('No hay publicaciones en el rango elegido.');
      expect(graficos).toHaveLength(0);
    });

    it('[E] si falla, Reintentar vuelve a pedir sólo el reparto', async () => {
      await abrirConOtras();
      pedirTipos('2026-03-02', '2026-03-31').flush({}, { status: 500, statusText: 'Error' });
      await actualizar();
      const reintentar = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent?.includes('Reintentar'))!;

      reintentar.click();
      await actualizar();

      expect(pedidos()).toHaveLength(0);
      expect(rankingPedidos()).toHaveLength(0);
      pedirTipos('2026-03-02', '2026-03-31').flush(TIPOS);
    });

    it('[O] al cambiar la fecha vuelve a pedir el reparto con el rango nuevo', async () => {
      await abrirConOtras();
      pedirTipos('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      await escribir(1, '2026-03-15');

      pedir('2026-03-02', '2026-03-15').flush([]);
      pedirComentarios('2026-03-02', '2026-03-15').flush([]);
      pedirRanking('2026-03-02', '2026-03-15').flush([]);
      const solicitud = pedirTipos('2026-03-02', '2026-03-15');
      expect(solicitud.request.params.get('hasta')).toBe('2026-03-15');
      solicitud.flush([]);
    });

    it('[E] con un rango inválido no pide el reparto', async () => {
      await abrirConOtras();
      pedirTipos('2026-03-02', '2026-03-31').flush([]);
      await actualizar();

      await escribir(0, '2026-04-05');

      expect(tiposPedidos()).toHaveLength(0);
    });

    it('[I] al salir de la pantalla cancela el pedido en curso', async () => {
      await abrirConOtras();
      const solicitud = pedirTipos('2026-03-02', '2026-03-31');

      fixture.destroy();

      expect(solicitud.cancelled).toBe(true);
    });
  });

  describe('resumen y rango rápido', () => {
    const abrirConLasDemas = async () => {
      await abrir('2026-03-31T15:00:00Z');
      pedir('2026-03-02', '2026-03-31').flush([]);
      pedirComentarios('2026-03-02', '2026-03-31').flush([]);
      pedirRanking('2026-03-02', '2026-03-31').flush([]);
      pedirTipos('2026-03-02', '2026-03-31').flush([]);
    };
    const botonesDeAtajo = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.tipos button') as NodeListOf<HTMLButtonElement>,
      );
    const atajo = (nombre: string) =>
      botonesDeAtajo().find((boton) => boton.textContent?.trim() === nombre)!;
    const marcados = () =>
      botonesDeAtajo()
        .filter((boton) => boton.getAttribute('aria-pressed') === 'true')
        .map((boton) => boton.textContent?.trim());
    const valores = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.indicador-valor') as NodeListOf<HTMLElement>,
      ).map((valor) => valor.textContent?.trim());

    const flushDeTodo = (desde: string, hasta: string) => {
      pedirResumen(desde, hasta).flush(RESUMEN);
      pedir(desde, hasta).flush([]);
      pedirComentarios(desde, hasta).flush([]);
      pedirRanking(desde, hasta).flush([]);
      pedirTipos(desde, hasta).flush([]);
    };

    it('[I] al abrir pide el resumen de los últimos 30 días hasta hoy', async () => {
      await abrirConLasDemas();

      const solicitud = pedirResumen('2026-03-02', '2026-03-31');

      expect(solicitud.request.method).toBe('GET');
      solicitud.flush(RESUMEN);
    });

    it('[O] muestra los tres totales y cuánto cambiaron contra el lapso anterior', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      expect(valores()).toEqual(['8', '20', '5']);
      expect(texto()).toContain('100 % más');
      expect(texto()).toContain('20 % menos');
      expect(texto()).toContain('Sin cambios');
    });

    it('[O] aclara con qué fechas se compara', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      expect(texto()).toContain('del 31 ene al 1 mar');
    });

    it('[Z] sin actividad en ninguno de los dos lapsos muestra ceros, no el mensaje de vacío', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush({
        actual: totales('2026-03-02', '2026-03-31', [0, 0, 0]),
        anterior: totales('2026-01-31', '2026-03-01', [0, 0, 0]),
      });
      await actualizar();

      expect(valores()).toEqual(['0', '0', '0']);
      expect(fixture.nativeElement.querySelectorAll('.indicador-variacion')).toHaveLength(3);
    });

    it('[E] si falla, Reintentar vuelve a pedir sólo el resumen', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush({}, { status: 500, statusText: 'Error' });
      await actualizar();
      const reintentar = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent?.includes('Reintentar'))!;

      reintentar.click();
      await actualizar();

      expect(pedidos()).toHaveLength(0);
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
    });

    it('[E] con un rango inválido no pide el resumen', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      await escribir(0, '2026-04-05');

      expect(resumenPedidos()).toHaveLength(0);
    });

    it('[O] ofrece 7, 30 y 90 días y 1 año, con 30 días marcado al abrir', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      expect(botonesDeAtajo().map((boton) => boton.textContent?.trim())).toEqual([
        '7 días',
        '30 días',
        '90 días',
        '1 año',
      ]);
      expect(marcados()).toEqual(['30 días']);
    });

    it('[O] 7 días cambia las dos fechas y vuelve a pedir todo', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      atajo('7 días').click();
      await actualizar();

      flushDeTodo('2026-03-25', '2026-03-31');
      await actualizar();
      expect(campo(0).value).toBe('2026-03-25');
      expect(campo(1).value).toBe('2026-03-31');
      expect(marcados()).toEqual(['7 días']);
    });

    it('[B] 1 año son 365 días, dentro del tope de 366', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      atajo('1 año').click();
      await actualizar();

      flushDeTodo('2025-04-01', '2026-03-31');
      await actualizar();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(marcados()).toEqual(['1 año']);
    });

    it('[S] si se cambia una fecha a mano ya no queda ningún atajo marcado', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      await escribir(0, '2026-03-10');

      expect(marcados()).toEqual([]);
    });

    it('[S] si las fechas vuelven a coincidir con un atajo, se marca', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();
      await escribir(0, '2026-03-25');

      expect(marcados()).toEqual(['7 días']);
    });

    it('[E] con un rango inválido no hay ningún atajo marcado', async () => {
      await abrirConLasDemas();
      pedirResumen('2026-03-02', '2026-03-31').flush(RESUMEN);
      await actualizar();

      await escribir(0, '2026-04-05');

      expect(marcados()).toEqual([]);
    });
  });
});
