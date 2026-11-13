import { Component } from '@angular/core';
import { Datos, GraficoBase, variable } from '../grafico-base';

const PUNTOS_VISIBLES_HASTA = 40;
const MARCAS_MAXIMAS_DEL_EJE = 10;

let chartJs: Promise<typeof import('chart.js')> | undefined;

function cargarChartJs() {
  chartJs ??= import('chart.js').then((modulo) => {
    modulo.Chart.register(
      modulo.LineController,
      modulo.LineElement,
      modulo.PointElement,
      modulo.CategoryScale,
      modulo.LinearScale,
      modulo.Tooltip,
    );
    return modulo;
  });
  return chartJs;
}

@Component({
  selector: 'app-grafico-lineas',
  template: `<div class="grafico h-80">
    <canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas>
  </div>`,
})
export class GraficoLineas extends GraficoBase {
  protected cargarLibreria() {
    return cargarChartJs();
  }

  protected configuracion({ etiquetas, valores, serie }: Datos) {
    const color = variable('--tema-serie-1');
    const tinta = variable('--tema-suave');
    return {
      type: 'line' as const,
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: serie,
            data: valores,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            pointRadius: etiquetas.length <= PUNTOS_VISIBLES_HASTA ? 4 : 0,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
          x: {
            ticks: { color: tinta, maxTicksLimit: MARCAS_MAXIMAS_DEL_EJE, maxRotation: 0 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: tinta, precision: 0 },
            grid: { color: variable('--tema-linea') },
          },
        },
        plugins: { legend: { display: false } },
      },
    };
  }
}
