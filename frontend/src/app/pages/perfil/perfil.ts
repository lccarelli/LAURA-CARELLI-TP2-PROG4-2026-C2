import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { Aviso } from '../../componentes/aviso/aviso';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { UltimosComentarios } from '../../componentes/ultimos-comentarios/ultimos-comentarios';
import { Publicacion } from '../../interfaces/publicacion';
import { Edad } from '../../pipes/edad';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';

const CANTIDAD_DE_ULTIMAS = 3;

@Component({
  imports: [
    CubreplatoLoading,
    DatePipe,
    Edad,
    RouterLink,
    TranslatePipe,
    Aviso,
    TarjetaPublicacion,
    UltimosComentarios,
  ],
  selector: 'app-perfil',
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);
  private pedido?: Subscription;

  protected auth = inject(Auth);
  protected urlImagen = urlImagen;

  readonly publicaciones = signal<Publicacion[]>([]);
  readonly cargando = signal(false);
  readonly cargaCompleta = signal(false);
  readonly mensajeError = signal<string | null>(null);

  ngOnInit() {
    this.cargar();
  }

  ngOnDestroy() {
    this.pedido?.unsubscribe();
  }

  cargar() {
    const usuario = this.auth.usuario();
    if (!usuario) {
      return;
    }

    this.pedido?.unsubscribe();
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.pedido = this.api.listar(0, CANTIDAD_DE_ULTIMAS, 'fecha', usuario._id).subscribe({
      next: (pagina) => {
        this.publicaciones.set(pagina.datos);
        this.cargaCompleta.set(true);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
