import { Component, computed, inject, input, output, PendingTasks, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PERFILES } from '../../interfaces/usuario';
import { Imagenes } from '../../servicios/imagenes/imagenes';
import { validarImagen } from '../../utilidades/imagen';
import {
  PATRON_CLAVE,
  PATRON_NOMBRE_USUARIO,
  clavesIguales,
  fechaPasada,
  mensajeDeLargo,
} from '../../utilidades/validadores';
import { CampoClave } from '../campo-clave/campo-clave';
import { CamposPersonales } from '../campos-personales/campos-personales';

@Component({
  imports: [CamposPersonales, ReactiveFormsModule, TranslatePipe, CampoClave],
  selector: 'app-formulario-usuario',
  templateUrl: './formulario-usuario.html',
})
export class FormularioUsuario {
  private formBuilder = inject(FormBuilder);
  private traductor = inject(TranslateService);
  private imagenes = inject(Imagenes);
  private tareas = inject(PendingTasks);
  private imagenesEnProceso = signal(0);

  readonly conPerfil = input(false);
  readonly enviando = input(false);
  readonly boton = input.required<string>();
  readonly botonEnviando = input.required<string>();
  readonly guardar = output<FormData>();

  readonly perfiles = PERFILES;
  readonly hoy = new Date().toISOString().slice(0, 10);
  readonly imagen = signal<File | null>(null);
  readonly errorImagen = signal<string | null>(null);
  readonly preparandoImagen = computed(() => this.imagenesEnProceso() > 0);

  readonly formulario = this.formBuilder.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(30)]],
      nombreUsuario: ['', [Validators.required, Validators.pattern(PATRON_NOMBRE_USUARIO)]],
      clave: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]],
      repetirClave: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required, fechaPasada]],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      perfil: ['usuario'],
    },
    { validators: clavesIguales },
  );

  mensajeDeError(campo: string): string | null {
    const control = this.formulario.get(campo);
    if (!control?.touched) {
      return null;
    }

    const largo = mensajeDeLargo(control, this.traductor);
    if (largo) {
      return largo;
    }
    const errores = control.errors;
    if (errores?.['email']) {
      return this.traductor.instant('validacion.correo');
    }
    if (errores?.['fechaFutura']) {
      return this.traductor.instant('validacion.fecha_futura');
    }
    if (errores?.['pattern'] && campo === 'clave') {
      return this.traductor.instant('validacion.clave');
    }
    if (errores?.['pattern']) {
      return this.traductor.instant('validacion.nombre_usuario');
    }
    if (campo === 'repetirClave' && this.formulario.errors?.['clavesDistintas']) {
      return this.traductor.instant('validacion.claves_distintas');
    }
    return null;
  }

  elegirImagen(evento: Event) {
    const original = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.imagenesEnProceso.update((n) => n + 1);
    this.tareas.run(async () => {
      try {
        const archivo = original && (await this.imagenes.preparar(original));
        const error = validarImagen(archivo);
        this.errorImagen.set(error);
        this.imagen.set(error ? null : archivo);
      } finally {
        this.imagenesEnProceso.update((n) => n - 1);
      }
    });
  }

  enviar() {
    this.formulario.markAllAsTouched();
    if (
      this.formulario.invalid ||
      this.errorImagen() ||
      this.enviando() ||
      this.preparandoImagen()
    ) {
      return;
    }

    const datos = new FormData();
    for (const [campo, valor] of Object.entries(this.formulario.getRawValue())) {
      if (campo === 'repetirClave' || (campo === 'perfil' && !this.conPerfil())) {
        continue;
      }
      datos.append(campo, campo === 'clave' ? valor : valor.trim());
    }
    const imagen = this.imagen();
    if (imagen) {
      datos.append('imagen', imagen);
    }
    this.guardar.emit(datos);
  }
}
