import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { Aviso } from '../../componentes/aviso/aviso';
import { BotonMeGusta } from '../../componentes/boton-me-gusta/boton-me-gusta';
import { Comentarios } from '../../componentes/comentarios/comentarios';
import { Ingrediente, Paso, Publicacion, UNIDADES } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
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
    BotonMeGusta,
    CubreplatoLoading,
    DatePipe,
    RouterLink,
    Aviso,
    Comentarios,
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

  readonly publicacion = signal<Publicacion | null>(null);
  readonly cargando = signal(true);
  readonly mensajeError = signal<string | null>(null);
  protected readonly errorMeGusta = signal<string | null>(null);

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
      .filter((paso) => typeof paso?.texto === 'string' && paso.texto.trim() !== '')
      .map((paso) => ({
        titulo: typeof paso!.titulo === 'string' ? paso!.titulo.trim() : '',
        texto: paso!.texto!,
        imagenes: Array.isArray(paso!.imagenes)
          ? paso!.imagenes.filter((imagen) => typeof imagen === 'string' && imagen !== '')
          : [],
      }));
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
    this.router.navigate(['/publicaciones']);
  }

  ngOnInit() {
    const id = this.ruta.snapshot.paramMap.get('id') ?? '';
    this.api.obtener(id).subscribe({
      next: (publicacion) => {
        this.publicacion.set(publicacion);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
