import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Resaltar } from '../../directivas/resaltar/resaltar';
import { Publicacion, Tipo } from '../../interfaces/publicacion';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { TextoLargo } from '../../pipes/texto-largo';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { puedeEliminarPublicacion } from '../../utilidades/permisos';
import { BotonMeGusta } from '../boton-me-gusta/boton-me-gusta';
import { Icono } from '../icono/icono';

const COLOR_DE_TIPO: Record<Tipo, string> = {
  receta: 'var(--tema-torta-1)',
  tip: 'var(--tema-torta-2)',
  experiencia: 'var(--tema-torta-3)',
};
const LETRAS_DEL_MENSAJE = 140;

@Component({
  imports: [BotonMeGusta, FechaRelativa, RouterLink, TextoLargo, TranslatePipe, Icono],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
  host: { class: 'pin-contenedor' },
  hostDirectives: [Resaltar],
})
export class TarjetaPublicacion {
  private api = inject(PublicacionesApi);
  private auth = inject(Auth);
  private resaltar = inject(Resaltar);

  protected readonly letrasDelMensaje = LETRAS_DEL_MENSAJE;

  readonly publicacion = input.required<Publicacion>();
  readonly eliminada = output<string>();

  constructor() {
    effect(() => this.resaltar.color.set(COLOR_DE_TIPO[this.publicacion().tipo]));
  }

  protected readonly enviando = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);

  protected readonly puedeEliminar = computed(() =>
    puedeEliminarPublicacion(this.auth.usuario(), this.publicacion()),
  );

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
