import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { Aviso } from '../../componentes/aviso/aviso';
import { BotonGuardar } from '../../componentes/boton-guardar/boton-guardar';
import { BotonMeGusta } from '../../componentes/boton-me-gusta/boton-me-gusta';
import { ItemComentario } from '../../componentes/item-comentario/item-comentario';
import { Comentarios } from '../../componentes/comentarios/comentarios';
import { EliminarPublicacion } from '../../componentes/eliminar-publicacion/eliminar-publicacion';
import {
  Ingrediente,
  Paso,
  Publicacion,
  PublicacionPublica,
  UNIDADES,
} from '../../interfaces/publicacion';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { puedeEliminarPublicacion } from '../../utilidades/permisos';
import { Icono } from '../../componentes/icono/icono';

const enteroEnRango = (valor: unknown, maximo: number) =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= maximo
    ? valor
    : undefined;

const esIngrediente = (valor: unknown): valor is Ingrediente => {
  const ingrediente = valor as Partial<Ingrediente> | null;
  return (
    typeof ingrediente === 'object' &&
    ingrediente !== null &&
    typeof ingrediente.nombre === 'string' &&
    ingrediente.nombre.trim() !== '' &&
    (UNIDADES as readonly unknown[]).includes(ingrediente.unidad) &&
    (ingrediente.cantidad === undefined ||
      (typeof ingrediente.cantidad === 'number' &&
        Number.isFinite(ingrediente.cantidad) &&
        ingrediente.cantidad > 0))
  );
};

@Component({
  imports: [
    BotonGuardar,
    BotonMeGusta,
    CubreplatoLoading,
    EliminarPublicacion,
    DatePipe,
    FechaRelativa,
    RouterLink,
    Aviso,
    Comentarios,
    ItemComentario,
    TranslatePipe,
    Icono,
  ],
  selector: 'app-detalle-publicacion',
  templateUrl: './detalle-publicacion.html',
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class DetallePublicacion implements OnInit {
  private api = inject(PublicacionesApi);
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private injector = inject(Injector);

  readonly soloLectura = this.ruta.snapshot.data?.['soloLectura'] === true;
  protected readonly salida = this.soloLectura ? '/' : '/publicaciones';
  readonly publicacion = signal<Publicacion | null>(null);
  protected readonly comentariosPublicos = computed(
    () => (this.publicacion() as PublicacionPublica | null)?.comentarios ?? [],
  );
  readonly cargando = signal(true);
  readonly mensajeError = signal<string | null>(null);
  protected readonly errorDeAccion = signal<string | null>(null);

  protected readonly puedeEliminar = computed(() => {
    const publicacion = this.publicacion();
    return publicacion !== null && puedeEliminarPublicacion(this.auth.usuario(), publicacion);
  });

  protected readonly puedeEditar = computed(
    () => this.publicacion()?.usuario._id === this.auth.usuario()?._id,
  );

  protected readonly ingredientes = computed(() => {
    const lista = this.publicacion()?.ingredientes;
    return Array.isArray(lista) ? lista.filter(esIngrediente) : [];
  });

  protected readonly pasos = computed((): Required<Paso>[] => {
    const lista: unknown = this.publicacion()?.pasos;
    if (!Array.isArray(lista)) {
      return [];
    }
    return lista
      .map((paso: unknown) =>
        typeof paso === 'string' ? { texto: paso } : (paso as Partial<Paso> | null),
      )
      .map((paso) => ({
        titulo: typeof paso?.titulo === 'string' ? paso.titulo.trim() : '',
        texto: typeof paso?.texto === 'string' ? paso.texto.trim() : '',
        imagenes: Array.isArray(paso?.imagenes)
          ? paso.imagenes.filter((imagen) => typeof imagen === 'string' && imagen !== '')
          : [],
      }))
      .filter((paso) => paso.titulo || paso.texto || paso.imagenes.length);
  });

  protected readonly rinde = computed(() =>
    this.publicacion()?.tipoRinde === 'unidades' ? 'unidades' : 'porciones',
  );

  protected readonly ficha = computed(() => {
    const publicacion = this.publicacion();
    return {
      porciones: enteroEnRango(publicacion?.porciones, 100),
      tiempoMinutos: enteroEnRango(publicacion?.tiempoMinutos, 10080),
      costo: enteroEnRango(publicacion?.costo, 4),
      calorias: enteroEnRango(publicacion?.calorias, 10000),
    };
  });

  protected urlImagen = urlImagen;

  protected signos(cantidad: number) {
    return '$'.repeat(cantidad);
  }

  protected sumarComentario() {
    this.publicacion.update((actual) =>
      actual ? { ...actual, cantidadComentarios: actual.cantidadComentarios + 1 } : actual,
    );
  }

  protected cerrar() {
    this.router.navigate([this.salida]);
  }

  private irALosComentariosSiSePidio() {
    if (this.ruta.snapshot.fragment !== 'comentarios') {
      return;
    }
    afterNextRender(
      () => document.getElementById('titulo-comentarios')?.scrollIntoView({ block: 'start' }),
      { injector: this.injector },
    );
  }

  ngOnInit() {
    const id = this.ruta.snapshot.paramMap.get('id') ?? '';
    const pedido = this.soloLectura ? this.api.obtenerPublico(id) : this.api.obtener(id);
    pedido.subscribe({
      next: (publicacion) => {
        this.publicacion.set(publicacion);
        this.cargando.set(false);
        this.irALosComentariosSiSePidio();
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
