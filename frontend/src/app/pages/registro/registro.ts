import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { FormularioUsuario } from '../../componentes/formulario-usuario/formulario-usuario';
import { MosaicoComidas } from '../../componentes/mosaico-comidas/mosaico-comidas';
import { Auth } from '../../servicios/auth/auth';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [RouterLink, Aviso, FormularioUsuario, MosaicoComidas, TranslatePipe],
  selector: 'app-registro',
  templateUrl: './registro.html',
})
export class Registro {
  private auth = inject(Auth);
  private router = inject(Router);

  readonly enviando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  registrar(datos: FormData) {
    this.enviando.set(true);
    this.auth.registro(datos).subscribe({
      next: () => this.router.navigate(['/publicaciones']),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
