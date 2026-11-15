import { inject, Pipe, PipeTransform } from '@angular/core';
import { Idioma } from '../servicios/idioma/idioma';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const SEMANA = 7 * DIA;
const MES = 30 * DIA;
const ANIO = 365 * DIA;

const UMBRAL_DE_AHORA = 45 * SEGUNDO;

@Pipe({ name: 'fechaRelativa', pure: false })
export class FechaRelativa implements PipeTransform {
  private idioma = inject(Idioma);

  transform(fecha: string | Date | null | undefined, ahora = Date.now()): string {
    if (!fecha) {
      return '';
    }
    const instante = new Date(fecha).getTime();
    if (Number.isNaN(instante)) {
      return '';
    }
    const formato = new Intl.RelativeTimeFormat(this.idioma.actual() ?? undefined, {
      numeric: 'auto',
    });
    const pasado = Math.max(0, ahora - instante);
    if (pasado < UMBRAL_DE_AHORA) {
      return formato.format(0, 'second');
    }
    if (pasado < HORA) {
      return formato.format(-Math.max(1, Math.floor(pasado / MINUTO)), 'minute');
    }
    if (pasado < DIA) {
      return formato.format(-Math.floor(pasado / HORA), 'hour');
    }
    if (pasado < SEMANA) {
      return formato.format(-Math.floor(pasado / DIA), 'day');
    }
    if (pasado < MES) {
      return formato.format(-Math.floor(pasado / SEMANA), 'week');
    }
    if (pasado < ANIO) {
      return formato.format(-Math.floor(pasado / MES), 'month');
    }
    return formato.format(-Math.floor(pasado / ANIO), 'year');
  }
}
