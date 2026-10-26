import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Modal } from '../../componentes/modal/modal';
import { Ventana } from '../../componentes/ventana/ventana';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { Publicacion, Tipo, TIPOS } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen, validarImagen } from '../../utilidades/imagen';

@Component({
  imports: [DatePipe, ReactiveFormsModule, Modal, Ventana, TarjetaPublicacion, TranslatePipe],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit {
  private api = inject(PublicacionesApi);
  private formBuilder = inject(FormBuilder);
  private traductor = inject(TranslateService);

  readonly publicaciones = signal<Publicacion[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly fallaLaCarga = signal(false);
  readonly publicando = signal(false);
  readonly tipos = TIPOS;
  readonly tipo = signal<Tipo>('receta');
  readonly seleccionada = signal<Publicacion | null>(null);
  readonly ventanaAbierta = signal(false);
  readonly imagen = signal<File | null>(null);
  readonly errorImagen = signal<string | null>(null);
  readonly aviso = signal<{ titulo: string; mensaje: string } | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(55)]],
    mensaje: ['', [Validators.required, Validators.maxLength(2000)]],
    ingredientes: ['', [Validators.maxLength(1000)]],
    pasos: ['', [Validators.maxLength(2000)]],
  });

  protected urlImagen = urlImagen;

  protected lineas(texto?: string) {
    return (texto ?? '')
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean);
  }

  protected llevaLista() {
    return this.tipo() === 'receta' || this.tipo() === 'completa';
  }

  ngOnInit() {
    this.cargarMas();
  }

  mensajeDeError(campo: string): string | null {
    const control = this.formulario.get(campo);
    if (!control?.touched) {
      return null;
    }
    if (control.errors?.['required']) {
      return this.traductor.instant('comun.obligatorio');
    }
    if (control.errors?.['maxlength']) {
      return this.traductor.instant('validacion.maximo', {
        n: control.errors['maxlength'].requiredLength,
      });
    }
    return null;
  }

  abrirVentana() {
    this.ventanaAbierta.set(true);
  }

  cerrarVentana() {
    this.ventanaAbierta.set(false);
    this.formulario.reset();
    this.tipo.set('receta');
    this.imagen.set(null);
    this.errorImagen.set(null);
  }

  elegirImagen(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const error = validarImagen(archivo);
    this.errorImagen.set(error);
    this.imagen.set(error ? null : archivo);
  }

  cargarMas() {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.api.listar(this.publicaciones().length).subscribe({
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
        this.aviso.set({
          titulo: 'publicaciones.error_cargar',
          mensaje: mensajeDeApi(error),
        });
      },
    });
  }

  publicar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.errorImagen() || this.publicando()) {
      return;
    }

    const { titulo, mensaje, ingredientes, pasos } = this.formulario.getRawValue();
    const datos = new FormData();
    datos.append('tipo', this.tipo());
    datos.append('titulo', titulo.trim());
    datos.append('mensaje', mensaje.trim());
    if (this.llevaLista() && ingredientes.trim()) {
      datos.append('ingredientes', ingredientes.trim());
    }
    if (this.llevaLista() && pasos.trim()) {
      datos.append('pasos', pasos.trim());
    }
    const imagen = this.imagen();
    if (imagen) {
      datos.append('imagen', imagen);
    }

    this.publicando.set(true);
    this.api.crear(datos).subscribe({
      next: (nueva) => {
        this.publicaciones.update((actuales) => [nueva, ...actuales]);
        this.publicando.set(false);
        this.cerrarVentana();
      },
      error: (error: HttpErrorResponse) => {
        this.publicando.set(false);
        this.aviso.set({
          titulo: 'publicaciones.error_publicar',
          mensaje: mensajeDeApi(error),
        });
      },
    });
  }
}
