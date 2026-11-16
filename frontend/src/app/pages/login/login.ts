import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CampoClave } from '../../componentes/campo-clave/campo-clave';
import { Aviso } from '../../componentes/aviso/aviso';
import { MosaicoComidas } from '../../componentes/mosaico-comidas/mosaico-comidas';
import { AutoFoco } from '../../directivas/auto-foco/auto-foco';
import { Auth } from '../../servicios/auth/auth';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [
    AutoFoco,
    ReactiveFormsModule,
    RouterLink,
    Aviso,
    MosaicoComidas,
    TranslatePipe,
    CampoClave,
  ],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private formBuilder = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);
  private traductor = inject(TranslateService);

  protected readonly motivoDeSalida = this.auth.motivoDeSalida;

  readonly enviando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    identificador: ['', [Validators.required, Validators.maxLength(30)]],
    clave: ['', [Validators.required, Validators.maxLength(12)]],
  });

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

  private destinoAlIngresar() {
    const destino = this.auth.volverA();
    this.auth.volverA.set(null);
    return destino?.startsWith('/') && !destino.startsWith('//') ? destino : '/publicaciones';
  }

  enviar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) {
      return;
    }

    const { identificador, clave } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.auth.ingresar(identificador.trim(), clave).subscribe({
      next: () => this.router.navigateByUrl(this.destinoAlIngresar()),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
