import {
  prepararBancoDeGrafico,
  pruebasComunesDeGrafico,
} from '../../../testing/prueba-de-grafico';
import { graficos } from '../../../testing/chart-falso';
import { GraficoBarras } from './grafico-barras';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

describe('GraficoBarras', () => {
  const banco = prepararBancoDeGrafico(GraficoBarras);

  pruebasComunesDeGrafico(banco, { tipo: 'bar', colorDe: (serie) => serie.backgroundColor });

  it('[O] las barras son horizontales para que los nombres largos se lean', async () => {
    banco.poner(['@laura_c'], [3]);

    await banco.dibujados(1);

    expect(graficos[0].config.options.indexAxis).toBe('y');
  });

  it('[O] la altura crece con la cantidad de barras y tiene un mínimo', async () => {
    banco.poner(['@a'], [1]);
    banco.fixture().detectChanges();
    const caja = banco.fixture().nativeElement.querySelector('.grafico') as HTMLElement;
    expect(caja.style.height).toBe('12rem');

    banco.poner(
      Array.from({ length: 10 }, (_, i) => `@u${i}`),
      Array(10).fill(1),
    );
    banco.fixture().detectChanges();

    expect(caja.style.height).toBe('29rem');
    await banco.dibujados(2);
  });

  it('[O] sin detalles el tooltip muestra la etiqueta de la barra', async () => {
    banco.poner(['@laura_c'], [3]);

    await banco.dibujados(1);

    const titulo = graficos[0].config.options.plugins!.tooltip!.callbacks.title!;
    expect(titulo([{ dataIndex: 0, label: '@laura_c' }])).toBe('@laura_c');
  });

  it('[O] con detalles el tooltip muestra el texto completo de cada barra', async () => {
    banco.fixture().componentRef.setInput('detalles', ['Título completo de la publicación']);
    banco.poner(['Título compl…'], [3]);

    await banco.dibujados(1);

    const titulo = graficos[0].config.options.plugins!.tooltip!.callbacks.title!;
    expect(titulo([{ dataIndex: 0, label: 'Título compl…' }])).toBe(
      'Título completo de la publicación',
    );
  });

  it('[O] con color 3 usa la serie 3 de la paleta y no la 1', async () => {
    document.documentElement.style.setProperty('--tema-serie-3', '#334455');
    banco.fixture().componentRef.setInput('color', 3);
    banco.poner(['A'], [1]);

    await banco.dibujados(1);

    expect(graficos[0].config.data.datasets[0].backgroundColor).toBe('#334455');
    document.documentElement.style.removeProperty('--tema-serie-3');
  });
});
