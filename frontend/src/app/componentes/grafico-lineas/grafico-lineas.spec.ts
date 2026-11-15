import {
  prepararBancoDeGrafico,
  pruebasComunesDeGrafico,
} from '../../../testing/prueba-de-grafico';
import { graficos } from '../../../testing/chart-falso';
import { GraficoLineas } from './grafico-lineas';

vi.mock('chart.js', async () => (await import('../../../testing/chart-falso')).moduloFalso);

describe('GraficoLineas', () => {
  const banco = prepararBancoDeGrafico(GraficoLineas);

  pruebasComunesDeGrafico(banco, { tipo: 'line', colorDe: (serie) => serie.borderColor });

  it('[O] la línea y los puntos usan el mismo color del tema', async () => {
    banco.poner(['10 mar'], [3]);

    await banco.dibujados(1);

    const serie = graficos[0].config.data.datasets[0];
    expect(serie.backgroundColor).toBe(serie.borderColor);
  });

  it('[O] el tooltip muestra el valor del día aunque el cursor no toque el punto', async () => {
    banco.poner(['10 mar'], [3]);

    await banco.dibujados(1);

    expect(graficos[0].config.options.interaction).toEqual({ mode: 'index', intersect: false });
  });
});
