import { ComponentFixture, TestBed } from '@angular/core/testing';
import { graficos } from '../../../testing/chart-falso';
import { Tema } from '../../servicios/tema/tema';
import { GraficoLineas } from './grafico-lineas';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

describe('GraficoLineas', () => {
  let fixture: ComponentFixture<GraficoLineas>;

  const poner = (etiquetas: string[], valores: number[]) => {
    fixture.componentRef.setInput('etiquetas', etiquetas);
    fixture.componentRef.setInput('valores', valores);
  };
  const dibujados = async (cantidad: number) => {
    await fixture.whenStable();
    await vi.waitFor(() => expect(graficos).toHaveLength(cantidad));
  };

  beforeEach(async () => {
    graficos.length = 0;
    localStorage.clear();
    document.documentElement.style.setProperty('--tema-serie-1', '#112233');
    await TestBed.configureTestingModule({ imports: [GraficoLineas] }).compileComponents();
    fixture = TestBed.createComponent(GraficoLineas);
    fixture.componentRef.setInput('serie', 'Comentarios');
    fixture.componentRef.setInput('descripcion', 'Descripción del gráfico');
  });

  afterEach(() => document.documentElement.style.removeProperty('--tema-serie-1'));

  it('[O] dibuja un gráfico de líneas con los días, los valores y la serie', async () => {
    poner(['10 mar', '11 mar'], [3, 0]);

    await dibujados(1);

    const { type, data } = graficos[0].config;
    expect(type).toBe('line');
    expect(data.labels).toEqual(['10 mar', '11 mar']);
    expect(data.datasets[0].data).toEqual([3, 0]);
    expect(data.datasets[0].label).toBe('Comentarios');
  });

  it('[O] toma el color de la línea de la variable CSS del tema', async () => {
    poner(['10 mar'], [3]);

    await dibujados(1);

    expect(graficos[0].config.data.datasets[0].borderColor).toBe('#112233');
    expect(graficos[0].config.data.datasets[0].backgroundColor).toBe('#112233');
  });

  it('[O] el tooltip muestra el valor del día aunque el cursor no toque el punto', async () => {
    poner(['10 mar'], [3]);

    await dibujados(1);

    expect(graficos[0].config.options.interaction).toEqual({ mode: 'index', intersect: false });
  });

  it('[O] el lienzo se describe para lectores de pantalla', async () => {
    poner(['10 mar'], [3]);
    await dibujados(1);

    const lienzo = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

    expect(lienzo.getAttribute('role')).toBe('img');
    expect(lienzo.getAttribute('aria-label')).toBe('Descripción del gráfico');
  });

  it('[S] al cambiar los datos destruye el gráfico anterior y dibuja uno nuevo', async () => {
    poner(['10 mar'], [3]);
    await dibujados(1);

    poner(['11 mar'], [5]);
    await dibujados(2);

    expect(graficos[0].destroy).toHaveBeenCalledTimes(1);
    expect(graficos[1].destroy).not.toHaveBeenCalled();
    expect(graficos[1].config.data.datasets[0].data).toEqual([5]);
  });

  it('[S] al cambiar el tema lo dibuja de nuevo con los colores nuevos', async () => {
    poner(['10 mar'], [3]);
    await dibujados(1);

    document.documentElement.style.setProperty('--tema-serie-1', '#aabbcc');
    TestBed.inject(Tema).alternar();
    await dibujados(2);

    expect(graficos[1].config.data.datasets[0].borderColor).toBe('#aabbcc');
  });

  it('[I] al salir de la pantalla destruye el gráfico', async () => {
    poner(['10 mar'], [3]);
    await dibujados(1);

    fixture.destroy();

    expect(graficos[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('[E] si se cierra antes de que cargue la librería no dibuja nada', async () => {
    poner(['10 mar'], [3]);
    fixture.detectChanges();

    fixture.destroy();
    await vi.dynamicImportSettled();

    expect(graficos).toHaveLength(0);
  });
});
