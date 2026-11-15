import { graficos } from '../../../testing/chart-falso';
import {
  prepararBancoDeGrafico,
  pruebasComunesDeGrafico,
} from '../../../testing/prueba-de-grafico';
import { GraficoTorta } from './grafico-torta';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

describe('GraficoTorta', () => {
  const banco = prepararBancoDeGrafico(GraficoTorta, '--tema-torta-1');

  pruebasComunesDeGrafico(banco, {
    tipo: 'pie',
    colorDe: (serie) => (serie.backgroundColor as string[])[0],
  });

  it('[O] cada porción tiene su propio color, tomado de las variables de la torta', async () => {
    document.documentElement.style.setProperty('--tema-torta-2', '#445566');
    document.documentElement.style.setProperty('--tema-torta-3', '#778899');
    banco.poner(['Receta', 'Tip', 'Experiencia'], [3, 1, 2]);

    await banco.dibujados(1);

    expect(graficos[0].config.data.datasets[0].backgroundColor).toEqual([
      '#112233',
      '#445566',
      '#778899',
    ]);
    document.documentElement.style.removeProperty('--tema-torta-2');
    document.documentElement.style.removeProperty('--tema-torta-3');
  });

  it('[O] la leyenda va abajo para identificar cada porción sin depender del color', async () => {
    banco.poner(['Receta', 'Tip'], [3, 1]);

    await banco.dibujados(1);

    expect(graficos[0].config.options.plugins?.legend?.position).toBe('bottom');
  });

  it('[O] el tooltip muestra la cantidad y el porcentaje de cada porción', async () => {
    banco.poner(['Receta', 'Tip'], [3, 1]);
    await banco.dibujados(1);

    const etiqueta = graficos[0].config.options.plugins!.tooltip!.callbacks.label!;

    expect(etiqueta({ label: 'Receta', parsed: 3 })).toBe('Receta: 3 (75 %)');
    expect(etiqueta({ label: 'Tip', parsed: 1 })).toBe('Tip: 1 (25 %)');
  });
});
