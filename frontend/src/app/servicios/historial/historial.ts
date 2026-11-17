import { inject, Service } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

export interface Posicion {
  y: number;
  cantidad: number;
}

const SIN_VUELTA = /(?:^\/(?:login|registro)(?:\/|\?|$))|(?:\/(?:nueva|editar)(?:\/|\?|$))/;

@Service()
export class Historial {
  private router = inject(Router);
  private listas = new Map<string, () => Posicion>();
  private guardadas = new Map<string, Posicion>();
  private volviendo = false;
  private actual: string | null = null;
  private anterior: string | null = null;

  iniciar() {
    this.router.events.subscribe((evento) => {
      if (evento instanceof NavigationStart) {
        this.listas.forEach((leer, clave) => this.guardadas.set(clave, leer()));
        this.volviendo = evento.navigationTrigger === 'popstate';
      } else if (evento instanceof NavigationEnd) {
        this.anterior = this.actual;
        this.actual = evento.urlAfterRedirects;
      }
    });
  }

  puedeVolver() {
    return this.anterior !== null && !SIN_VUELTA.test(this.anterior);
  }

  registrar(clave: string, leer: () => Posicion) {
    this.listas.set(clave, leer);
    return () => this.listas.delete(clave);
  }

  restaurar(clave: string) {
    const posicion = this.volviendo ? this.guardadas.get(clave) : undefined;
    this.guardadas.delete(clave);
    return posicion;
  }
}
