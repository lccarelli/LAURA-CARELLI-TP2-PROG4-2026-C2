import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Publicacion } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
  host: { class: 'pin-contenedor' },
})
export class TarjetaPublicacion {
  private api = inject(PublicacionesApi);
  private auth = inject(Auth);

  readonly publicacion = input.required<Publicacion>();
  readonly eliminada = output<string>();

  protected readonly meGusta = linkedSignal(() => ({
    dado: this.publicacion().meGusta ?? false,
    cantidad: this.publicacion().cantidadMeGusta,
  }));
  protected readonly enviando = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);

  protected readonly puedeEliminar = computed(() => {
    const usuario = this.auth.usuario();
    return (
      usuario !== null &&
      (usuario.perfil === 'administrador' || usuario._id === this.publicacion().usuario._id)
    );
  });

  protected urlImagen = urlImagen;

  protected alternarMeGusta() {
    if (this.enviando()) {
      return;
    }
    const { dado, cantidad } = this.meGusta();
    this.enviando.set(true);
    this.mensajeError.set(null);

    if (dado) {
      this.api.quitarMeGusta(this.publicacion()._id).subscribe({
        next: () => this.terminarMeGusta(false, Math.max(0, cantidad - 1)),
        error: (error: HttpErrorResponse) => this.fallarMeGusta(error, false),
      });
    } else {
      this.api.darMeGusta(this.publicacion()._id).subscribe({
        next: (respuesta) => this.terminarMeGusta(true, respuesta.cantidadMeGusta),
        error: (error: HttpErrorResponse) => this.fallarMeGusta(error, true),
      });
    }
  }

  protected pedirConfirmacion() {
    this.mensajeError.set(null);
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
    this.mensajeError.set(null);
    this.api.eliminar(this.publicacion()._id).subscribe({
      next: () => {
        this.enviando.set(false);
        this.eliminada.emit(this.publicacion()._id);
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.confirmando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }

  private terminarMeGusta(dado: boolean, cantidad: number) {
    this.meGusta.set({ dado, cantidad });
    this.enviando.set(false);
  }

  private fallarMeGusta(error: HttpErrorResponse, queriaDar: boolean) {
    this.enviando.set(false);
    const codigo = error.error?.codigo;
    if (queriaDar && codigo === 'ME_GUSTA_REPETIDO') {
      this.meGusta.update((actual) => ({ ...actual, dado: true }));
      return;
    }
    if (!queriaDar && codigo === 'ME_GUSTA_INEXISTENTE') {
      this.meGusta.update((actual) => ({ ...actual, dado: false }));
      return;
    }
    this.mensajeError.set(mensajeDeApi(error));
  }
}
