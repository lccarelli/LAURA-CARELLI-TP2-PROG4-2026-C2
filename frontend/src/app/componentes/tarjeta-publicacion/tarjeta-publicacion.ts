import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Publicacion } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { BotonMeGusta } from '../boton-me-gusta/boton-me-gusta';
import { Icono } from '../icono/icono';

@Component({
  imports: [BotonMeGusta, RouterLink, TranslatePipe, Icono],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
  host: { class: 'pin-contenedor' },
})
export class TarjetaPublicacion {
  private api = inject(PublicacionesApi);
  private auth = inject(Auth);

  readonly publicacion = input.required<Publicacion>();
  readonly eliminada = output<string>();

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
}
