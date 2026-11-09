import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Comentario } from '../../interfaces/comentario';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { Aviso } from '../aviso/aviso';

@Component({
  imports: [DatePipe, Aviso, TranslatePipe],
  selector: 'app-comentarios',
  templateUrl: './comentarios.html',
})
export class Comentarios implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);

  private pedido?: Subscription;

  readonly publicacionId = input.required<string>();

  readonly comentarios = signal<Comentario[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly fallaLaCarga = signal(false);
  readonly mensajeError = signal<string | null>(null);

  protected urlImagen = urlImagen;

  ngOnInit() {
    this.cargarMas();
  }

  ngOnDestroy() {
    this.pedido?.unsubscribe();
  }

  cargarMas() {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.pedido = this.api
      .listarComentarios(this.publicacionId(), this.comentarios().length)
      .subscribe({
        next: (pagina) => {
          const ids = new Set(this.comentarios().map((comentario) => comentario._id));
          const nuevos = pagina.datos.filter((comentario) => !ids.has(comentario._id));
          this.comentarios.update((actuales) => [...actuales, ...nuevos]);
          this.cargando.set(false);
          this.fallaLaCarga.set(false);
          this.hayMas.set(pagina.hayMas);
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError.set(mensajeDeApi(error));
          this.fallaLaCarga.set(true);
          this.cargando.set(false);
        },
      });
  }
}
