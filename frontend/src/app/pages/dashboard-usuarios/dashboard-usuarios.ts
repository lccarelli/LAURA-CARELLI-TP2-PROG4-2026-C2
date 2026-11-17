import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { ModalConfirmacion } from '../../componentes/modal-confirmacion/modal-confirmacion';
import { VerMas } from '../../componentes/ver-mas/ver-mas';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { UsuariosApi } from '../../servicios/usuarios/usuarios';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { ListadoPaginado } from '../../utilidades/listado-paginado';

type Accion = 'deshabilitar' | 'habilitar';

@Component({
  imports: [Aviso, ModalConfirmacion, RouterLink, VerMas, TranslatePipe],
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
  readonly pendiente = signal<{ accion: Accion; usuario: Usuario } | null>(null);
  readonly enviando = signal(false);
  readonly hecho = signal<{ accion: Accion; nombreUsuario: string } | null>(null);
  readonly error = signal<{ accion: Accion; mensaje: string } | null>(null);

  ngOnInit() {
    this.listado.cargarMas();
  }

  ngOnDestroy() {
    this.listado.cancelar();
  }

  puedeDeshabilitar(usuario: Usuario) {
    return usuario.habilitado && usuario._id !== this.auth.usuario()?._id;
  }

  pedir(accion: Accion, usuario: Usuario) {
    this.creado.set(null);
    this.hecho.set(null);
    this.error.set(null);
    this.pendiente.set({ accion, usuario });
  }

  cancelar() {
    this.pendiente.set(null);
  }

  confirmar() {
    const pendiente = this.pendiente();
    if (!pendiente || this.enviando()) {
      return;
    }

    const { accion, usuario } = pendiente;
    this.enviando.set(true);
    const pedido =
      accion === 'habilitar' ? this.api.habilitar(usuario._id) : this.api.deshabilitar(usuario._id);
    pedido.subscribe({
      next: (actualizado) => {
        this.listado.actualizar(usuario._id, { habilitado: actualizado.habilitado });
        this.hecho.set({ accion, nombreUsuario: usuario.nombreUsuario });
        this.terminar();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set({ accion, mensaje: mensajeDeApi(error) });
        this.terminar();
      },
    });
  }

  private terminar() {
    this.enviando.set(false);
    this.pendiente.set(null);
  }
}
