import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { Icono } from '../icono/icono';

@Component({
  imports: [TranslatePipe, Icono],
  selector: 'app-boton-me-gusta',
  templateUrl: './boton-me-gusta.html',
})
export class BotonMeGusta {
  private api = inject(PublicacionesApi);

  readonly publicacionId = input.required<string>();
  readonly meGustaDado = input(false);
  readonly cantidadMeGusta = input.required<number>();
  readonly fallo = output<string | null>();

  protected readonly estado = linkedSignal(() => ({
    meGustaDado: this.meGustaDado(),
    cantidadMeGusta: this.cantidadMeGusta(),
  }));
  protected readonly enviando = signal(false);

  protected alternar() {
    if (this.enviando()) {
      return;
    }
    const { meGustaDado, cantidadMeGusta } = this.estado();
    this.enviando.set(true);
    this.fallo.emit(null);

    if (meGustaDado) {
      this.api.quitarMeGusta(this.publicacionId()).subscribe({
        next: () => this.terminar(false, Math.max(0, cantidadMeGusta - 1)),
        error: (error: HttpErrorResponse) => this.fallar(error, false),
      });
    } else {
      this.api.darMeGusta(this.publicacionId()).subscribe({
        next: (respuesta) => this.terminar(true, respuesta.cantidadMeGusta),
        error: (error: HttpErrorResponse) => this.fallar(error, true),
      });
    }
  }

  private terminar(meGustaDado: boolean, cantidadMeGusta: number) {
    this.estado.set({ meGustaDado, cantidadMeGusta });
    this.enviando.set(false);
  }

  private fallar(error: HttpErrorResponse, queriaDar: boolean) {
    this.enviando.set(false);
    const codigo = error.error?.codigo;
    if (queriaDar && codigo === 'ME_GUSTA_REPETIDO') {
      this.estado.update((actual) => ({ ...actual, meGustaDado: true }));
      return;
    }
    if (!queriaDar && codigo === 'ME_GUSTA_INEXISTENTE') {
      this.estado.update((actual) => ({ ...actual, meGustaDado: false }));
      return;
    }
    this.fallo.emit(mensajeDeApi(error));
  }
}
