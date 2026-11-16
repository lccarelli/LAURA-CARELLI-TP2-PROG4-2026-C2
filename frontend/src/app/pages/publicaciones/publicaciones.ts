import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { VerMas } from '../../componentes/ver-mas/ver-mas';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { Aviso } from '../../componentes/aviso/aviso';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import {
  OrdenPublicaciones,
  ORDENES,
  Publicacion,
  Tipo,
  TIPOS,
} from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { ListadoPaginado } from '../../utilidades/listado-paginado';

@Component({
  imports: [VerMas, CubreplatoLoading, RouterLink, Aviso, TarjetaPublicacion, TranslatePipe],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);
  private ruta = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private iniciado = false;

  readonly ordenes = ORDENES;
  readonly orden = signal<OrdenPublicaciones>('fecha');
  readonly tipos = TIPOS;
  readonly tipo = signal<Tipo | null>(null);
  readonly busqueda = signal('');
  readonly listado = new ListadoPaginado<Publicacion>((offset) =>
    this.api.listar(
      offset,
      10,
      this.orden(),
      undefined,
      this.tipo() ?? undefined,
      this.busqueda() || undefined,
    ),
  );

  readonly columnas = signal(this.cantidadDeColumnas());
  readonly muro = computed(() => {
    const columnas: Publicacion[][] = Array.from({ length: this.columnas() }, () => []);
    this.listado
      .items()
      .forEach((publicacion, i) => columnas[i % columnas.length].push(publicacion));
    return columnas;
  });
  private alCambiarElAncho = () => this.columnas.set(this.cantidadDeColumnas());

  ngOnInit() {
    this.ruta.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parametros) => this.alCambiarLaBusqueda(parametros.get('q') ?? ''));
    window.addEventListener('resize', this.alCambiarElAncho);
  }

  ngOnDestroy() {
    this.listado.cancelar();
    window.removeEventListener('resize', this.alCambiarElAncho);
  }

  private cantidadDeColumnas() {
    if (window.innerWidth >= 1024) {
      return 4;
    }
    return window.innerWidth >= 768 ? 3 : 2;
  }

  cambiarOrden(orden: OrdenPublicaciones) {
    if (orden === this.orden()) {
      return;
    }
    this.orden.set(orden);
    this.listado.reiniciar();
  }

  private alCambiarLaBusqueda(texto: string) {
    if (this.iniciado) {
      this.buscar(texto);
      return;
    }
    this.iniciado = true;
    this.busqueda.set(texto);
    this.listado.cargarMas();
  }

  buscar(texto: string) {
    if (texto === this.busqueda()) {
      return;
    }
    this.busqueda.set(texto);
    this.listado.reiniciar();
  }

  cambiarTipo(tipo: Tipo | null) {
    if (tipo === this.tipo()) {
      return;
    }
    this.tipo.set(tipo);
    this.listado.reiniciar();
  }
}
