import { Component, computed } from '@angular/core';
import { Datos, GraficoBase, variable } from '../grafico-base';

const ALTURA_MINIMA_REM = 12;
const REM_POR_BARRA = 2.5;

let chartJs: Promise<typeof import('chart.js')> | undefined;

function cargarChartJs() {
  chartJs ??= import('chart.js').then((modulo) => {
    modulo.Chart.register(
      modulo.BarController,
      modulo.BarElement,
      modulo.CategoryScale,
      modulo.LinearScale,
      modulo.Tooltip,
    );
    return modulo;
  });
  return chartJs;
}

@Component({
  selector: 'app-grafico-barras',
  template: `<div class="grafico" [style.height.rem]="altura()">
    <canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas>
  </div>`,
})
export class GraficoBarras extends GraficoBase {
  readonly altura = computed(() =>
    Math.max(ALTURA_MINIMA_REM, this.etiquetas().length * REM_POR_BARRA + 4),
  );

  protected cargarLibreria() {
    return cargarChartJs();
  }

  protected configuracion({ etiquetas, valores, serie }: Datos) {
    const tinta = variable('--tema-suave');
    return {
      type: 'bar' as const,
      data: {
        labels: etiquetas,
        datasets: [{ label: serie, data: valores, backgroundColor: variable('--tema-serie-1') }],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: tinta, precision: 0 },
            grid: { color: variable('--tema-linea') },
          },
          y: { ticks: { color: tinta }, grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    };
  }
}
