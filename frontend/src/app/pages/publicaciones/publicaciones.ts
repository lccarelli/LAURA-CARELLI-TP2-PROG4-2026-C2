import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { VerMas } from '../../componentes/ver-mas/ver-mas';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { Aviso } from '../../componentes/aviso/aviso';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { OrdenPublicaciones, ORDENES, Publicacion } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { ListadoPaginado } from '../../utilidades/listado-paginado';

@Component({
  imports: [VerMas, CubreplatoLoading, RouterLink, Aviso, TarjetaPublicacion, TranslatePipe],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);

  readonly ordenes = ORDENES;
  readonly orden = signal<OrdenPublicaciones>('fecha');
  readonly listado = new ListadoPaginado<Publicacion>((offset) =>
    this.api.listar(offset, 10, this.orden()),
  );

  ngOnInit() {
    this.listado.cargarMas();
  }

  ngOnDestroy() {
    this.listado.cancelar();
  }

  cambiarOrden(orden: OrdenPublicaciones) {
    if (orden === this.orden()) {
      return;
    }
    this.orden.set(orden);
    this.listado.reiniciar();
  }
}
