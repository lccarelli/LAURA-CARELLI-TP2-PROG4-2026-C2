import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { mensajeDeApi } from './errores';

interface Pagina<T> {
  datos: T[];
  hayMas: boolean;
}

export class ListadoPaginado<T extends { _id: string }> {
  readonly items = signal<T[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly fallaLaCarga = signal(false);
  readonly mensajeError = signal<string | null>(null);

  private pedido?: Subscription;

  constructor(private readonly traer: (offset: number) => Observable<Pagina<T>>) {}

  cargarMas() {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.pedido = this.traer(this.items().length).subscribe({
      next: (pagina) => {
        const ids = new Set(this.items().map(({ _id }) => _id));
        const nuevos = pagina.datos.filter(({ _id }) => !ids.has(_id));
        this.items.update((actuales) => [...actuales, ...nuevos]);
        this.hayMas.set(pagina.hayMas);
        this.fallaLaCarga.set(false);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.fallaLaCarga.set(true);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }

  reiniciar() {
    this.cancelar();
    this.items.set([]);
    this.hayMas.set(false);
    this.cargando.set(false);
    this.fallaLaCarga.set(false);
    this.mensajeError.set(null);
    this.cargarMas();
  }

  quitar(id: string) {
    this.items.update((actuales) => actuales.filter((item) => item._id !== id));
  }

  cancelar() {
    this.pedido?.unsubscribe();
  }
}
