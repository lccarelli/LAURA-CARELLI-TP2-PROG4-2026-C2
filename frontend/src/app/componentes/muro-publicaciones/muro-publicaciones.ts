import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  LetraDelIndice,
  OrdenPublicaciones,
  ORDENES,
  Publicacion,
  Tipo,
  TIPOS,
} from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { ListadoPaginado } from '../../utilidades/listado-paginado';
import { Aviso } from '../aviso/aviso';
import { TarjetaPublicacion } from '../tarjeta-publicacion/tarjeta-publicacion';
import { VerMas } from '../ver-mas/ver-mas';

@Component({
  imports: [Aviso, TarjetaPublicacion, TranslatePipe, VerMas],
  selector: 'app-muro-publicaciones',
  templateUrl: './muro-publicaciones.html',
  host: { class: 'flex flex-col gap-4' },
})
export class MuroPublicaciones implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);
  private iniciado = false;

  readonly usuario = input<string>();
  readonly consulta = input('');
  readonly mensajeVacio = input('publicaciones.vacio');
  readonly tipoElegido = input<Tipo | null>(null);
  readonly ordenElegido = input<OrdenPublicaciones>('fecha');
  readonly guardadas = input(false);
  readonly letra = input<LetraDelIndice | null>(null);
  readonly quitada = output<string>();

  readonly ordenes = ORDENES;
  readonly orden = signal<OrdenPublicaciones>('fecha');
  readonly tipos = TIPOS;
  readonly tipo = signal<Tipo | null>(null);
  readonly busqueda = signal('');
  readonly listado = new ListadoPaginado<Publicacion>((offset) =>
    this.guardadas()
      ? this.api.listarGuardadas(
          offset,
          10,
          this.letra(),
          this.tipo() ?? undefined,
          this.busqueda() || undefined,
        )
      : this.api.listar(
          offset,
          10,
          this.orden(),
          this.usuario(),
          this.tipo() ?? undefined,
          this.busqueda() || undefined,
        ),
  );
  private letraIniciada = false;

  readonly columnas = signal(this.cantidadDeColumnas());
  readonly muro = computed(() => {
    const columnas: Publicacion[][] = Array.from({ length: this.columnas() }, () => []);
    this.listado
      .items()
      .forEach((publicacion, i) => columnas[i % columnas.length].push(publicacion));
    return columnas;
  });
  private alCambiarElAncho = () => this.columnas.set(this.cantidadDeColumnas());

  constructor() {
    effect(() => {
      const tipo = this.tipoElegido();
      const orden = this.ordenElegido();
      untracked(() => this.aplicarFiltros(tipo, orden));
    });
    effect(() => {
      this.letra();
      untracked(() => {
        if (this.letraIniciada) {
          this.listado.reiniciar();
        }
        this.letraIniciada = true;
      });
    });
    effect(() => {
      const texto = this.consulta();
      untracked(() => this.alCambiarLaBusqueda(texto));
    });
  }

  ngOnInit() {
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

  private aplicarFiltros(tipo: Tipo | null, orden: OrdenPublicaciones) {
    const cambio = tipo !== this.tipo() || orden !== this.orden();
    this.tipo.set(tipo);
    this.orden.set(orden);
    if (cambio && this.iniciado) {
      this.listado.reiniciar();
    }
  }

  alDesguardar(id: string) {
    if (this.guardadas()) {
      this.listado.quitar(id);
      this.quitada.emit(id);
    }
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
