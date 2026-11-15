import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Idioma } from '../../servicios/idioma/idioma';

@Component({
  imports: [TranslatePipe],
  selector: 'app-indicador',
  templateUrl: './indicador.html',
})
export class Indicador {
  private idioma = inject(Idioma);

  readonly etiqueta = input.required<string>();
  readonly valor = input.required<number>();
  readonly anterior = input.required<number>();

  private readonly formato = computed(
    () => new Intl.NumberFormat(this.idioma.actual() ?? undefined),
  );

  protected readonly valorTexto = computed(() => this.formato().format(this.valor()));

  protected readonly variacion = computed(() => {
    const valor = this.valor();
    const anterior = this.anterior();
    if (valor === anterior) {
      return { clave: 'estadisticas.variacion_igual', porcentaje: '0', simbolo: '=' };
    }
    if (anterior === 0) {
      return { clave: 'estadisticas.variacion_sin_base', porcentaje: '0', simbolo: '▲' };
    }
    const porcentaje = this.formato().format(
      Math.max(1, Math.round((Math.abs(valor - anterior) / anterior) * 100)),
    );
    return valor > anterior
      ? { clave: 'estadisticas.variacion_sube', porcentaje, simbolo: '▲' }
      : { clave: 'estadisticas.variacion_baja', porcentaje, simbolo: '▼' };
  });
}
