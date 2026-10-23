import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from '../../componentes/modal/modal';
import { Auth } from '../../servicios/auth/auth';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Modal],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private formBuilder = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  readonly enviando = signal(false);
  readonly mensajeModal = signal<string | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    identificador: ['', [Validators.required, Validators.maxLength(100)]],
    clave: ['', [Validators.required, Validators.maxLength(12)]],
  });

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

  enviar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) {
      return;
    }

    const { identificador, clave } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.auth.ingresar(identificador.trim(), clave).subscribe({
      next: () => this.router.navigate(['/publicaciones']),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mensajeModal.set(mensajeDeApi(error));
      },
    });
  }
}
