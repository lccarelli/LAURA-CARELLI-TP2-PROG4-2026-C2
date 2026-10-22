import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from '../../componentes/modal/modal';
import { Auth } from '../../servicios/auth/auth';
import { mensajeDeApi } from '../../utilidades/errores';
import { validarImagen } from '../../utilidades/imagen';
import {
  PATRON_CLAVE,
  PATRON_NOMBRE_USUARIO,
  clavesIguales,
  fechaPasada,
} from '../../utilidades/validadores';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Modal],
  selector: 'app-registro',
  templateUrl: './registro.html',
})
export class Registro {
  private formBuilder = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  readonly hoy = new Date().toISOString().slice(0, 10);
  readonly imagen = signal<File | null>(null);
  readonly errorImagen = signal<string | null>(null);
  readonly enviando = signal(false);
  readonly mensajeModal = signal<string | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      nombreUsuario: ['', [Validators.required, Validators.pattern(PATRON_NOMBRE_USUARIO)]],
      clave: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]],
      repetirClave: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required, fechaPasada]],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
    },
    { validators: clavesIguales },
  );

  mensajeDeError(campo: string): string | null {
    const control = this.formulario.get(campo);
    if (!control?.touched) {
      return null;
    }

    const errores = control.errors;
    if (errores?.['required']) {
      return 'Este campo es obligatorio';
    }
    if (errores?.['minlength']) {
      return `Debe tener al menos ${errores['minlength'].requiredLength} caracteres`;
    }
    if (errores?.['maxlength']) {
      return `Debe tener como máximo ${errores['maxlength'].requiredLength} caracteres`;
    }
    if (errores?.['email']) {
      return 'Ingresá un correo válido';
    }
    if (errores?.['fechaFutura']) {
      return 'La fecha no puede ser futura';
    }
    if (errores?.['pattern'] && campo === 'clave') {
      return 'Entre 8 y 12 caracteres, con una mayúscula y un número';
    }
    if (errores?.['pattern']) {
      return 'Entre 3 y 20 caracteres: letras, números o guion bajo';
    }
    if (campo === 'repetirClave' && this.formulario.errors?.['clavesDistintas']) {
      return 'Las claves no coinciden';
    }
    return null;
  }

  elegirImagen(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const error = validarImagen(archivo);
    this.errorImagen.set(error);
    this.imagen.set(error ? null : archivo);
  }

  enviar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.errorImagen() || this.enviando()) {
      return;
    }

    const datos = new FormData();
    for (const [campo, valor] of Object.entries(this.formulario.getRawValue())) {
      if (campo !== 'repetirClave') {
        datos.append(campo, campo === 'clave' ? valor : valor.trim());
      }
    }
    const imagen = this.imagen();
    if (imagen) {
      datos.append('imagen', imagen);
    }

    this.enviando.set(true);
    this.auth.registro(datos).subscribe({
      next: () => this.router.navigate(['/publicaciones']),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mensajeModal.set(mensajeDeApi(error));
      },
    });
  }
}
