import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [TranslatePipe],
  selector: 'app-eliminar-publicacion',
  templateUrl: './eliminar-publicacion.html',
})
export class EliminarPublicacion {
  private publicacionesApi = inject(PublicacionesApi);

  readonly publicacionId = input.required<string>();
  readonly publicacionEliminada = output<void>();
  readonly publicacionFallada = output<string | null>();

  protected readonly confirmando = signal(false);
  protected readonly enviando = signal(false);

  protected pedirConfirmacion() {
    this.publicacionFallada.emit(null);
    this.confirmando.set(true);
  }

  protected cancelar() {
    this.confirmando.set(false);
  }

  protected eliminar() {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.publicacionFallada.emit(null);
    this.publicacionesApi.eliminar(this.publicacionId()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.publicacionEliminada.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.confirmando.set(false);
        this.publicacionFallada.emit(mensajeDeApi(error));
      },
    });
  }
}
