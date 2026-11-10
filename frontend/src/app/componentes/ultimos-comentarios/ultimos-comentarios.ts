import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Comentario } from '../../interfaces/comentario';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { Aviso } from '../aviso/aviso';

export const COMENTARIOS_EN_EL_PERFIL = 3;

@Component({
  imports: [DatePipe, RouterLink, TranslatePipe, Aviso],
  selector: 'app-ultimos-comentarios',
  templateUrl: './ultimos-comentarios.html',
})
export class UltimosComentarios implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);
  private pedido?: Subscription;

  readonly publicacionId = input.required<string>();
  readonly cantidad = input.required<number>();

  protected urlImagen = urlImagen;

  readonly comentarios = signal<Comentario[]>([]);
  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  ngOnInit() {
    this.cargar();
  }

  ngOnDestroy() {
    this.pedido?.unsubscribe();
  }

  cargar() {
    if (this.cantidad() === 0) {
      return;
    }

    this.pedido?.unsubscribe();
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.pedido = this.api
      .listarComentarios(this.publicacionId(), 0, COMENTARIOS_EN_EL_PERFIL)
      .subscribe({
        next: (pagina) => {
          this.comentarios.set(pagina.datos);
          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargando.set(false);
          this.mensajeError.set(mensajeDeApi(error));
        },
      });
  }
}
