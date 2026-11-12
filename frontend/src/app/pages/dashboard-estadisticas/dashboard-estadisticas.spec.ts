import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { graficos } from '../../../testing/chart-falso';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { DashboardEstadisticas } from './dashboard-estadisticas';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

const URL = `${environment.API_URL}/estadisticas/publicaciones-por-usuario`;
const LAURA = { usuario: 'u1', nombreUsuario: 'laura_c', cantidad: 3 };
const JUAN = { usuario: 'u2', nombreUsuario: 'juan_p', cantidad: 1 };

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
});
