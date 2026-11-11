import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { ModalConfirmacion } from '../../componentes/modal-confirmacion/modal-confirmacion';
import { VerMas } from '../../componentes/ver-mas/ver-mas';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { UsuariosApi } from '../../servicios/usuarios/usuarios';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { ListadoPaginado } from '../../utilidades/listado-paginado';

@Component({
  imports: [Aviso, CubreplatoLoading, ModalConfirmacion, RouterLink, VerMas, TranslatePipe],
  selector: 'app-dashboard-usuarios',
  templateUrl: './dashboard-usuarios.html',
})
export class DashboardUsuarios implements OnInit, OnDestroy {
  private api = inject(UsuariosApi);
  private auth = inject(Auth);

  readonly urlImagen = urlImagen;
  readonly listado = new ListadoPaginado<Usuario>((offset) => this.api.listar(offset));
  readonly creado = signal<string | null>(
    inject(Router).currentNavigation()?.extras.state?.['creado'] ?? null,
  );
  readonly porDeshabilitar = signal<Usuario | null>(null);
  readonly deshabilitando = signal(false);
  readonly deshabilitado = signal<string | null>(null);
  readonly errorBaja = signal<string | null>(null);

  ngOnInit() {
    this.listado.cargarMas();
  }

  ngOnDestroy() {
    this.listado.cancelar();
  }

  puedeDeshabilitar(usuario: Usuario) {
    return usuario.habilitado && usuario._id !== this.auth.usuario()?._id;
  }

  pedirDeshabilitar(usuario: Usuario) {
    this.creado.set(null);
    this.deshabilitado.set(null);
    this.errorBaja.set(null);
    this.porDeshabilitar.set(usuario);
  }

  cancelarDeshabilitar() {
    this.porDeshabilitar.set(null);
  }

  confirmarDeshabilitar() {
    const usuario = this.porDeshabilitar();
    if (!usuario || this.deshabilitando()) {
      return;
    }

    this.deshabilitando.set(true);
    this.api.deshabilitar(usuario._id).subscribe({
      next: () => {
        this.listado.actualizar(usuario._id, { habilitado: false });
        this.deshabilitado.set(usuario.nombreUsuario);
        this.terminarBaja();
      },
      error: (error: HttpErrorResponse) => {
        this.errorBaja.set(mensajeDeApi(error));
        this.terminarBaja();
      },
    });
  }

  private terminarBaja() {
    this.deshabilitando.set(false);
    this.porDeshabilitar.set(null);
  }
}
