import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { Aviso } from '../../componentes/aviso/aviso';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { OrdenPublicaciones, ORDENES, Publicacion } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { Subscription } from 'rxjs';

@Component({
  imports: [CubreplatoLoading, RouterLink, Aviso, TarjetaPublicacion, TranslatePipe],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);

  private pedido?: Subscription;

  readonly ordenes = ORDENES;
  readonly orden = signal<OrdenPublicaciones>('fecha');
  readonly publicaciones = signal<Publicacion[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly fallaLaCarga = signal(false);
  readonly mensajeError = signal<string | null>(null);

  ngOnInit() {
    this.cargarMas();
  }

  ngOnDestroy() {
    this.pedido?.unsubscribe();
  }

  cambiarOrden(orden: OrdenPublicaciones) {
    if (orden === this.orden()) {
      return;
    }
    this.pedido?.unsubscribe();
    this.orden.set(orden);
    this.publicaciones.set([]);
    this.hayMas.set(false);
    this.cargando.set(false);
    this.fallaLaCarga.set(false);
    this.mensajeError.set(null);
    this.cargarMas();
  }

  quitar(id: string) {
    this.publicaciones.update((actuales) => actuales.filter(({ _id }) => _id !== id));
  }

  cargarMas() {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.pedido = this.api.listar(this.publicaciones().length, 10, this.orden()).subscribe({
      next: (pagina) => {
        const ids = new Set(this.publicaciones().map((publicacion) => publicacion._id));
        const nuevas = pagina.datos.filter((publicacion) => !ids.has(publicacion._id));
        this.publicaciones.update((actuales) => [...actuales, ...nuevas]);
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
}
