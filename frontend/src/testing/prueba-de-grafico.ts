import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraficoBase } from '../app/componentes/grafico-base';
import { Tema } from '../app/servicios/tema/tema';
import { ConfiguracionFalsa, graficos } from './chart-falso';

export interface BancoDeGrafico {
  variable: string;
  fixture: () => ComponentFixture<GraficoBase>;
  poner: (etiquetas: string[], valores: number[]) => void;
  dibujados: (cantidad: number) => Promise<void>;
}

export function prepararBancoDeGrafico(
  componente: Type<GraficoBase>,
  variable = '--tema-serie-1',
): BancoDeGrafico {
  let fixture: ComponentFixture<GraficoBase>;

  beforeEach(async () => {
    graficos.length = 0;
    localStorage.clear();
    document.documentElement.style.setProperty(variable, '#112233');
    await TestBed.configureTestingModule({ imports: [componente] }).compileComponents();
    fixture = TestBed.createComponent(componente);
    fixture.componentRef.setInput('serie', 'Serie de prueba');
    fixture.componentRef.setInput('descripcion', 'Descripción del gráfico');
  });

  afterEach(() => document.documentElement.style.removeProperty(variable));

  return {
    variable,
    fixture: () => fixture,
    poner: (etiquetas, valores) => {
      fixture.componentRef.setInput('etiquetas', etiquetas);
      fixture.componentRef.setInput('valores', valores);
    },
    dibujados: async (cantidad) => {
      await fixture.whenStable();
      await vi.waitFor(() => expect(graficos).toHaveLength(cantidad));
    },
  };
}

export function pruebasComunesDeGrafico(
  { variable, fixture, poner, dibujados }: BancoDeGrafico,
  esperado: {
    tipo: string;
    colorDe: (serie: ConfiguracionFalsa['data']['datasets'][number]) => unknown;
  },
) {
  it('[O] dibuja el tipo de gráfico con las etiquetas, los valores y la serie', async () => {
    poner(['A', 'B'], [3, 1]);

    await dibujados(1);

    const { type, data } = graficos[0].config;
    expect(type).toBe(esperado.tipo);
    expect(data.labels).toEqual(['A', 'B']);
    expect(data.datasets[0].data).toEqual([3, 1]);
    expect(data.datasets[0].label).toBe('Serie de prueba');
  });

  it('[O] toma el color de la variable CSS del tema', async () => {
    poner(['A'], [3]);

    await dibujados(1);

    expect(esperado.colorDe(graficos[0].config.data.datasets[0])).toBe('#112233');
  });

  it('[O] el lienzo se describe para lectores de pantalla', async () => {
    poner(['A'], [3]);
    await dibujados(1);

    const lienzo = fixture().nativeElement.querySelector('canvas') as HTMLCanvasElement;

    expect(lienzo.getAttribute('role')).toBe('img');
    expect(lienzo.getAttribute('aria-label')).toBe('Descripción del gráfico');
  });

  it('[S] al cambiar los datos destruye el gráfico anterior y dibuja uno nuevo', async () => {
    poner(['A'], [3]);
    await dibujados(1);

    poner(['B'], [5]);
    await dibujados(2);

    expect(graficos[0].destroy).toHaveBeenCalledTimes(1);
    expect(graficos[1].destroy).not.toHaveBeenCalled();
    expect(graficos[1].config.data.datasets[0].data).toEqual([5]);
  });

  it('[S] al cambiar el tema lo dibuja de nuevo con los colores nuevos', async () => {
    poner(['A'], [3]);
    await dibujados(1);

    document.documentElement.style.setProperty(variable, '#aabbcc');
    TestBed.inject(Tema).alternar();
    await dibujados(2);

    expect(esperado.colorDe(graficos[1].config.data.datasets[0])).toBe('#aabbcc');
  });

  it('[I] al salir de la pantalla destruye el gráfico', async () => {
    poner(['A'], [3]);
    await dibujados(1);

    fixture().destroy();

    expect(graficos[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('[E] si se cierra antes de que cargue la librería no dibuja nada', async () => {
    poner(['A'], [3]);
    fixture().detectChanges();

    fixture().destroy();
    await vi.dynamicImportSettled();

    expect(graficos).toHaveLength(0);
  });
}
