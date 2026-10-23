import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../componentes/modal/modal';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { Publicacion } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { validarImagen } from '../../utilidades/imagen';

@Component({
  imports: [ReactiveFormsModule, Modal, TarjetaPublicacion],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit {
  private api = inject(PublicacionesApi);
  private formBuilder = inject(FormBuilder);
  private archivo = viewChild<ElementRef<HTMLInputElement>>('archivo');

  readonly publicaciones = signal<Publicacion[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly publicando = signal(false);
  readonly imagen = signal<File | null>(null);
  readonly errorImagen = signal<string | null>(null);
  readonly aviso = signal<{ titulo: string; mensaje: string } | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(100)]],
    mensaje: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit() {
    this.cargarMas();
  }

  mensajeDeError(campo: string): string | null {
    const control = this.formulario.get(campo);
    if (!control?.touched) {
      return null;
    }
    if (control.errors?.['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors?.['maxlength']) {
      return `Debe tener como máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    }
    return null;
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
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.aviso.set({
          titulo: 'No se pudieron cargar las publicaciones',
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

    const { titulo, mensaje } = this.formulario.getRawValue();
    const datos = new FormData();
    datos.append('titulo', titulo.trim());
    datos.append('mensaje', mensaje.trim());
    const imagen = this.imagen();
    if (imagen) {
      datos.append('imagen', imagen);
    }

    this.publicando.set(true);
    this.api.crear(datos).subscribe({
      next: (nueva) => {
        this.publicaciones.update((actuales) => [nueva, ...actuales]);
        this.formulario.reset();
        this.imagen.set(null);
        this.errorImagen.set(null);
        const campoArchivo = this.archivo();
        if (campoArchivo) {
          campoArchivo.nativeElement.value = '';
        }
        this.publicando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.publicando.set(false);
        this.aviso.set({
          titulo: 'No se pudo publicar',
          mensaje: mensajeDeApi(error),
        });
      },
    });
  }
}
