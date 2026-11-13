import { HttpErrorResponse } from '@angular/common/http';
import { computed, Signal, signal, WritableSignal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { mensajeDeApi } from './errores';

export type EstadoDeCarga = 'ninguno' | 'cargando' | 'vacio' | 'datos';

export interface EstadoVisible {
  readonly estado: Signal<EstadoDeCarga>;
  readonly mensajeError: WritableSignal<string | null>;
}

export class Carga<T> implements EstadoVisible {
  readonly datos = signal<T | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly estado = computed<EstadoDeCarga>(() => {
    const datos = this.datos();
    if (this.cargando()) {
      return 'cargando';
    }
    if (datos === null) {
      return 'ninguno';
    }
    return this.esVacio(datos) ? 'vacio' : 'datos';
  });

  private esVacio: (datos: T) => boolean;
  private pedido?: Subscription;

  constructor(esVacio: (datos: T) => boolean) {
    this.esVacio = esVacio;
  }

  cargar(origen: Observable<T>) {
    this.pedido?.unsubscribe();
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.pedido = origen.subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.mensajeError.set(mensajeDeApi(error));
        this.cargando.set(false);
      },
    });
  }

  detener() {
    this.pedido?.unsubscribe();
    this.cargando.set(false);
  }
}
