import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { Icono } from '../icono/icono';

@Component({
  imports: [TranslatePipe, Icono],
  selector: 'app-boton-guardar',
  templateUrl: './boton-guardar.html',
})
export class BotonGuardar {
  private api = inject(PublicacionesApi);

  readonly publicacionId = input.required<string>();
  readonly guardada = input(false);
  readonly fallo = output<string | null>();
  readonly cambio = output<boolean>();

  protected readonly estado = linkedSignal(() => this.guardada());
  protected readonly enviando = signal(false);

  protected alternar() {
    if (this.enviando()) {
      return;
    }
    const guardar = !this.estado();
    this.enviando.set(true);
    this.fallo.emit(null);
    const pedido: Observable<unknown> = guardar
      ? this.api.guardar(this.publicacionId())
      : this.api.quitarGuardada(this.publicacionId());
    pedido.subscribe({
      next: () => {
        this.estado.set(guardar);
        this.enviando.set(false);
        this.cambio.emit(guardar);
      },
      error: (error: HttpErrorResponse) => this.fallar(error, guardar),
    });
  }

  private fallar(error: HttpErrorResponse, queriaGuardar: boolean) {
    this.enviando.set(false);
    const codigo = error.error?.codigo;
    const yaEstabaAsi =
      (queriaGuardar && codigo === 'GUARDADA_REPETIDA') ||
      (!queriaGuardar && codigo === 'GUARDADA_INEXISTENTE');
    if (yaEstabaAsi) {
      this.estado.set(queriaGuardar);
      this.cambio.emit(queriaGuardar);
      return;
    }
    this.fallo.emit(mensajeDeApi(error));
  }
}
