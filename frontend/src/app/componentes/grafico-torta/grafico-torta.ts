import { Component } from '@angular/core';
import { Datos, GraficoBase, variable } from '../grafico-base';

const COLORES = ['--tema-torta-1', '--tema-torta-2', '--tema-torta-3'];

let chartJs: Promise<typeof import('chart.js')> | undefined;

function cargarChartJs() {
  chartJs ??= import('chart.js').then((modulo) => {
    modulo.Chart.register(modulo.PieController, modulo.ArcElement, modulo.Tooltip, modulo.Legend);
    return modulo;
  });
  return chartJs;
}

@Component({
  selector: 'app-grafico-torta',
  template: `<div class="grafico h-80">
    <canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas>
  </div>`,
})
export class GraficoTorta extends GraficoBase {
  protected cargarLibreria() {
    return cargarChartJs();
  }

  protected configuracion({ etiquetas, valores, serie }: Datos) {
    const total = valores.reduce((suma, valor) => suma + valor, 0);
    return {
      type: 'pie' as const,
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: serie,
            data: valores,
            backgroundColor: etiquetas.map((_, indice) =>
              variable(COLORES[indice % COLORES.length]),
            ),
            borderColor: variable('--tema-hoja'),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' as const, labels: { color: variable('--tema-suave') } },
          tooltip: {
            callbacks: {
              label: (elemento: { label: string; parsed: number }) =>
                `${elemento.label}: ${elemento.parsed} (${Math.round((elemento.parsed / total) * 100)} %)`,
            },
          },
        },
      },
    };
  }
}
