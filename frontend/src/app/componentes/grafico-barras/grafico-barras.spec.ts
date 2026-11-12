import { ComponentFixture, TestBed } from '@angular/core/testing';
import { graficos } from '../../../testing/chart-falso';
import { Tema } from '../../servicios/tema/tema';
import { GraficoBarras } from './grafico-barras';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

describe('GraficoBarras', () => {
  let fixture: ComponentFixture<GraficoBarras>;

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
    await TestBed.configureTestingModule({ imports: [GraficoBarras] }).compileComponents();
    fixture = TestBed.createComponent(GraficoBarras);
    fixture.componentRef.setInput('serie', 'Publicaciones');
    fixture.componentRef.setInput('descripcion', 'Descripción del gráfico');
  });

  afterEach(() => document.documentElement.style.removeProperty('--tema-serie-1'));

  it('[O] dibuja un gráfico de barras con las etiquetas, los valores y la serie', async () => {
    poner(['@laura_c', '@juan_p'], [3, 1]);

    await dibujados(1);

    const { type, data } = graficos[0].config;
    expect(type).toBe('bar');
    expect(data.labels).toEqual(['@laura_c', '@juan_p']);
    expect(data.datasets[0].data).toEqual([3, 1]);
    expect(data.datasets[0].label).toBe('Publicaciones');
  });

  it('[O] las barras son horizontales para que los nombres largos se lean', async () => {
    poner(['@laura_c'], [3]);

    await dibujados(1);

    expect(graficos[0].config.options.indexAxis).toBe('y');
  });

  it('[O] la altura crece con la cantidad de barras y tiene un mínimo', async () => {
    poner(['@a'], [1]);
    fixture.detectChanges();
    const caja = fixture.nativeElement.querySelector('.grafico') as HTMLElement;
    expect(caja.style.height).toBe('12rem');

    poner(
      Array.from({ length: 10 }, (_, i) => `@u${i}`),
      Array(10).fill(1),
    );
    fixture.detectChanges();

    expect(caja.style.height).toBe('29rem');
    await dibujados(2);
  });

  it('[O] toma el color de las barras de la variable CSS del tema', async () => {
    poner(['@laura_c'], [3]);

    await dibujados(1);

    expect(graficos[0].config.data.datasets[0].backgroundColor).toBe('#112233');
  });

  it('[O] el lienzo se describe para lectores de pantalla', async () => {
    poner(['@laura_c'], [3]);
    await dibujados(1);

    const lienzo = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

    expect(lienzo.getAttribute('role')).toBe('img');
    expect(lienzo.getAttribute('aria-label')).toBe('Descripción del gráfico');
  });

  it('[S] al cambiar los datos destruye el gráfico anterior y dibuja uno nuevo', async () => {
    poner(['@laura_c'], [3]);
    await dibujados(1);

    poner(['@juan_p'], [5]);
    await dibujados(2);

    expect(graficos[0].destroy).toHaveBeenCalledTimes(1);
    expect(graficos[1].destroy).not.toHaveBeenCalled();
    expect(graficos[1].config.data.datasets[0].data).toEqual([5]);
  });

  it('[S] al cambiar el tema lo dibuja de nuevo con los colores nuevos', async () => {
    poner(['@laura_c'], [3]);
    await dibujados(1);

    document.documentElement.style.setProperty('--tema-serie-1', '#aabbcc');
    TestBed.inject(Tema).alternar();
    await dibujados(2);

    expect(graficos[1].config.data.datasets[0].backgroundColor).toBe('#aabbcc');
  });

  it('[I] al salir de la pantalla destruye el gráfico', async () => {
    poner(['@laura_c'], [3]);
    await dibujados(1);

    fixture.destroy();

    expect(graficos[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('[E] si se cierra antes de que cargue la librería no dibuja nada', async () => {
    poner(['@laura_c'], [3]);
    fixture.detectChanges();

    fixture.destroy();
    await vi.dynamicImportSettled();

    expect(graficos).toHaveLength(0);
  });
});
