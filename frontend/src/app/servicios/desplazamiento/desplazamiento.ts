import { computed, Service, signal } from '@angular/core';

export const DESPLAZAMIENTO_MINIMO = 8;
export const ZONA_DEL_TOPE = 64;
export const ZONA_DEL_FINAL = 8;

@Service()
export class Desplazamiento {
  private posicion = 0;

  readonly subiendo = signal(false);
  readonly enElTope = signal(this.estaEnElTope(window.scrollY));
  readonly enElFinal = signal(false);
  readonly mostrar = computed(() => this.enElTope() || this.subiendo() || this.enElFinal());

  constructor() {
    window.addEventListener('scroll', () => this.alDesplazar(), { passive: true });
  }

  private alDesplazar() {
    const actual = Math.max(0, window.scrollY);
    this.enElTope.set(this.estaEnElTope(actual));
    this.enElFinal.set(this.estaEnElFinal(actual));
    const diferencia = actual - this.posicion;
    if (Math.abs(diferencia) < DESPLAZAMIENTO_MINIMO) {
      return;
    }
    this.subiendo.set(diferencia < 0);
    this.posicion = actual;
  }

  private estaEnElTope(posicion: number) {
    return posicion <= ZONA_DEL_TOPE;
  }

  private estaEnElFinal(posicion: number) {
    const alto = document.documentElement.scrollHeight;
    const sePuedeDesplazar = alto > window.innerHeight;
    return sePuedeDesplazar && posicion + window.innerHeight >= alto - ZONA_DEL_FINAL;
  }
}
