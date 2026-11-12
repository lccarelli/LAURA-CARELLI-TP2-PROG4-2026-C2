import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { Chart } from 'chart.js';
import { Tema } from '../../servicios/tema/tema';

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

function variable(nombre: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

@Component({
  selector: 'app-grafico-barras',
  template: `<div class="grafico" [style.height.rem]="altura()">
    <canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas>
  </div>`,
})
export class GraficoBarras {
  readonly etiquetas = input.required<string[]>();
  readonly valores = input.required<number[]>();
  readonly serie = input.required<string>();
  readonly descripcion = input.required<string>();

  readonly altura = computed(() =>
    Math.max(ALTURA_MINIMA_REM, this.etiquetas().length * REM_POR_BARRA + 4),
  );

  private tema = inject(Tema);
  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico?: Chart;
  private destruido = false;

  constructor() {
    afterRenderEffect(() => {
      this.tema.actual();
      void this.dibujar(this.etiquetas(), this.valores(), this.serie());
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.grafico?.destroy();
    });
  }

  private async dibujar(etiquetas: string[], valores: number[], serie: string) {
    const { Chart } = await cargarChartJs();
    if (this.destruido) {
      return;
    }

    const tinta = variable('--tema-suave');
    const linea = variable('--tema-linea');
    this.grafico?.destroy();
    this.grafico = new Chart(this.lienzo().nativeElement, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{ label: serie, data: valores, backgroundColor: variable('--tema-serie-1') }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: tinta, precision: 0 },
            grid: { color: linea },
          },
          y: { ticks: { color: tinta }, grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
}
