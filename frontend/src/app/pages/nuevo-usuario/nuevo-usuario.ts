import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { FormularioUsuario } from '../../componentes/formulario-usuario/formulario-usuario';
import { UsuariosApi } from '../../servicios/usuarios/usuarios';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [Aviso, FormularioUsuario, RouterLink, TranslatePipe],
  selector: 'app-nuevo-usuario',
  templateUrl: './nuevo-usuario.html',
})
export class NuevoUsuario {
  private usuariosApi = inject(UsuariosApi);
  private router = inject(Router);

  readonly enviando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  crear(datos: FormData) {
    this.enviando.set(true);
    this.mensajeError.set(null);
    this.usuariosApi.crear(datos).subscribe({
      next: (usuario) =>
        this.router.navigate(['/dashboard/usuarios'], {
          state: { creado: usuario.nombreUsuario },
        }),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
