import { inject, Pipe, PipeTransform } from '@angular/core';
import { Idioma } from '../servicios/idioma/idioma';

@Pipe({ name: 'edad', pure: false })
export class Edad implements PipeTransform {
  private idioma = inject(Idioma);

  transform(nacimiento: string | Date | null | undefined, hoy = new Date()): string {
    if (!nacimiento) {
      return '';
    }
    const fecha = new Date(nacimiento);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }
    let anios = hoy.getFullYear() - fecha.getUTCFullYear();
    const aunNoCumplio =
      hoy.getMonth() < fecha.getUTCMonth() ||
      (hoy.getMonth() === fecha.getUTCMonth() && hoy.getDate() < fecha.getUTCDate());
    if (aunNoCumplio) {
      anios--;
    }
    if (anios < 0) {
      return '';
    }
    return new Intl.NumberFormat(this.idioma.actual() ?? undefined, {
      style: 'unit',
      unit: 'year',
      unitDisplay: 'long',
    }).format(anios);
  }
}
