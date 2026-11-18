import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { graficos } from '../../../testing/chart-falso';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Idioma } from '../../servicios/idioma/idioma';
import { etiquetaDeDia } from '../../utilidades/fechas';
import { DashboardEstadisticas } from './dashboard-estadisticas';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

const API = `${environment.API_URL}/estadisticas`;
const DESDE = '2026-03-02';
const HASTA = '2026-03-31';
const COLORES: Record<number, string> = { 2: '#222222', 3: '#333333', 4: '#444444' };

const DIAS = [
  { fecha: '2026-03-30', cantidad: 2 },
  { fecha: '2026-03-31', cantidad: 0 },
];

const SECCIONES = [
  {
    ruta: 'ingresos-por-usuario',
    titulo: 'Ingresos por usuario',
    tituloEn: 'Logins per user',
    vacio: 'Nadie ingresó en el rango elegido.',
    componente: 'app-grafico-barras',
    color: 2,
    serie: 'Ingresos',
    datos: [
      { usuario: 'u1', nombreUsuario: 'laura_c', cantidad: 4 },
      { usuario: 'u2', nombreUsuario: 'juan_p', cantidad: 1 },
    ],
    sinDatos: [] as unknown[],
    etiquetas: ['@laura_c', '@juan_p'],
    valores: [4, 1],
  },
  {
    ruta: 'visitas-a-mi-perfil',
    titulo: 'Visitas a perfiles',
    tituloEn: 'Profile visits',
    vacio: 'Nadie visitó perfiles ajenos en el rango elegido.',
    componente: 'app-grafico-lineas',
    color: 3,
    serie: 'Visitas',
    datos: DIAS,
    sinDatos: DIAS.map((dia) => ({ ...dia, cantidad: 0 })),
    etiquetas: DIAS.map((dia) => etiquetaDeDia(dia.fecha, 'es')),
    valores: [2, 0],
  },
  {
    ruta: 'megusta-por-dia',
    titulo: 'Me gusta por día',
    tituloEn: 'Likes per day',
    vacio: 'No se otorgaron me gusta en el rango elegido.',
    componente: 'app-grafico-lineas',
    color: 4,
    serie: 'Me gusta',
    datos: DIAS.map((dia) => ({ ...dia, cantidad: dia.cantidad + 5 })),
    sinDatos: DIAS.map((dia) => ({ ...dia, cantidad: 0 })),
    etiquetas: DIAS.map((dia) => etiquetaDeDia(dia.fecha, 'es')),
    valores: [7, 5],
  },
] as const;

describe.each(SECCIONES)('DashboardEstadisticas: $titulo', (seccion) => {
  let fixture: ComponentFixture<DashboardEstadisticas>;
  let http: HttpTestingController;

  const texto = () => fixture.nativeElement.textContent as string;
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const de = (ruta: string) => http.match((pedido) => pedido.url === `${API}/${ruta}`);
  const resumenVacio = {
    actual: { desde: DESDE, hasta: HASTA, publicaciones: 0, comentarios: 0, personasActivas: 0 },
    anterior: { desde: DESDE, hasta: HASTA, publicaciones: 0, comentarios: 0, personasActivas: 0 },
  };
  const responder = (datos: readonly unknown[], error?: { codigo: string; estado: number }) => {
    for (const pedido of http.match(() => true)) {
      const ruta = pedido.request.url.replace(`${API}/`, '');
      if (ruta !== seccion.ruta) {
        pedido.flush(ruta === 'resumen' ? resumenVacio : []);
      } else if (error) {
        pedido.flush({ codigo: error.codigo }, { status: error.estado, statusText: 'Error' });
      } else {
        pedido.flush(datos);
      }
    }
  };
  const abrir = async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-31T15:00:00Z'));
    fixture = TestBed.createComponent(DashboardEstadisticas);
    await fixture.whenStable();
  };
  const grafico = () => graficos.find((g) => g.config.data.datasets[0].label === seccion.serie);

  beforeEach(async () => {
    graficos.length = 0;
    localStorage.clear();
    for (const [numero, color] of Object.entries(COLORES)) {
      document.documentElement.style.setProperty(`--tema-serie-${numero}`, color);
    }
    await TestBed.configureTestingModule({
      imports: [DashboardEstadisticas],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const numero of Object.keys(COLORES)) {
      document.documentElement.style.removeProperty(`--tema-serie-${numero}`);
    }
  });

  it('[I] al abrir pide la sección con los últimos 30 días hasta hoy', async () => {
    await abrir();

    const [pedido, ...otros] = de(seccion.ruta);

    expect(otros).toHaveLength(0);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('desde')).toBe(DESDE);
    expect(pedido.request.params.get('hasta')).toBe(HASTA);
    responder([]);
  });

  it('[O] con datos muestra el título y dibuja el gráfico con sus etiquetas y valores', async () => {
    await abrir();
    responder(seccion.datos);
    await actualizar();
    await vi.waitFor(() => expect(grafico()).toBeDefined());

    expect(texto()).toContain(seccion.titulo);
    expect(fixture.nativeElement.querySelector(seccion.componente)).not.toBeNull();
    expect(grafico()!.config.data.labels).toEqual(seccion.etiquetas);
    expect(grafico()!.config.data.datasets[0].data).toEqual(seccion.valores);
  });

  it('[S] usa su propio color de la paleta, distinto del de las otras estadísticas', async () => {
    await abrir();
    responder(seccion.datos);
    await actualizar();
    await vi.waitFor(() => expect(grafico()).toBeDefined());

    const conjunto = grafico()!.config.data.datasets[0];

    expect(conjunto.backgroundColor).toBe(COLORES[seccion.color]);
    expect(Object.values(COLORES).filter((color) => color !== COLORES[seccion.color])).toHaveLength(
      2,
    );
  });

  it('[I] el gráfico tiene una descripción para lectores de pantalla', async () => {
    await abrir();
    responder(seccion.datos);
    await actualizar();

    const lienzo = fixture.nativeElement.querySelector(`${seccion.componente} canvas`);

    expect(lienzo.getAttribute('role')).toBe('img');
    expect(lienzo.getAttribute('aria-label')).toContain('Gráfico de');
  });

  it('[Z] sin datos muestra el mensaje y no el gráfico', async () => {
    await abrir();
    responder(seccion.sinDatos);
    await actualizar();

    expect(texto()).toContain(seccion.vacio);
    expect(grafico()).toBeUndefined();
  });

  it('[S] mientras carga no muestra ni el gráfico ni el mensaje de vacío', async () => {
    await abrir();
    await actualizar();

    expect(texto()).not.toContain(seccion.vacio);
    expect(fixture.nativeElement.querySelector(seccion.componente)).toBeNull();
    responder([]);
  });

  it('[E] si falla muestra el aviso con el motivo y permite reintentar sólo esta sección', async () => {
    await abrir();
    responder([], { codigo: 'NO_ES_ADMINISTRADOR', estado: 403 });
    await actualizar();

    expect(texto()).toContain('No pudimos cargar las estadísticas.');
    const reintentar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.includes('Reintentar'))!;
    reintentar.click();
    await actualizar();

    const pedidos = http.match(() => true);
    expect(pedidos.map((pedido) => pedido.request.url)).toEqual([`${API}/${seccion.ruta}`]);
    pedidos[0].flush(seccion.datos);
    await actualizar();
    expect(texto()).not.toContain('No pudimos cargar las estadísticas.');
  });

  it('[S] el error de esta sección no impide que las otras se vean', async () => {
    await abrir();
    responder([], { codigo: 'NO_ES_ADMINISTRADOR', estado: 403 });
    await actualizar();

    expect(texto()).toContain('Resumen del período');
    expect(texto()).toContain('Publicaciones por usuario');
  });

  it('[O] al cambiar el rango vuelve a pedir la sección con las fechas nuevas', async () => {
    await abrir();
    responder(seccion.datos);
    await actualizar();

    const desde = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;
    desde.value = '2026-03-20';
    desde.dispatchEvent(new Event('change'));
    await actualizar();

    const [pedido] = de(seccion.ruta);
    expect(pedido.request.params.get('desde')).toBe('2026-03-20');
    expect(pedido.request.params.get('hasta')).toBe(HASTA);
    http.match(() => true).forEach((otro) => otro.flush([]));
  });

  it('[E] con un rango inválido no pide la sección', async () => {
    await abrir();
    responder(seccion.datos);
    await actualizar();

    const hasta = fixture.nativeElement.querySelectorAll(
      'input[type="date"]',
    )[1] as HTMLInputElement;
    hasta.value = '2026-03-01';
    hasta.dispatchEvent(new Event('change'));
    await actualizar();

    expect(de(seccion.ruta)).toHaveLength(0);
  });

  it('[S] en inglés el título y la serie se traducen', async () => {
    TestBed.inject(Idioma).cambiar('en');
    await abrir();
    responder(seccion.datos);
    await actualizar();

    expect(texto()).toContain(seccion.tituloEn);
    expect(texto()).not.toContain(seccion.titulo);
  });
});
