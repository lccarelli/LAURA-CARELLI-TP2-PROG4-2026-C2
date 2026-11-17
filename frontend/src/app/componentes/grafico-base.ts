import {
  afterRenderEffect,
  Directive,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { Chart, ChartConfiguration } from 'chart.js';

type ChartJs = typeof import('chart.js');

export interface Datos {
  etiquetas: string[];
  valores: number[];
  serie: string;
  detalles?: string[];
}

export function variable(nombre: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

@Directive()
export abstract class GraficoBase {
  readonly etiquetas = input.required<string[]>();
  readonly valores = input.required<number[]>();
  readonly serie = input.required<string>();
  readonly descripcion = input.required<string>();
  readonly detalles = input<string[]>();

  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico?: Chart;
  private destruido = false;

  constructor() {
    afterRenderEffect(() => {
      void this.dibujar({
        etiquetas: this.etiquetas(),
        valores: this.valores(),
        serie: this.serie(),
        detalles: this.detalles(),
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.grafico?.destroy();
    });
  }

  protected abstract cargarLibreria(): Promise<ChartJs>;

  protected abstract configuracion(datos: Datos): ChartConfiguration;

  private async dibujar(datos: Datos) {
    const { Chart } = await this.cargarLibreria();
    if (this.destruido) {
      return;
    }

    this.grafico?.destroy();
    this.grafico = new Chart(this.lienzo().nativeElement, this.configuracion(datos));
  }
}
