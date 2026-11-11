import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { VerMas } from '../../componentes/ver-mas/ver-mas';
import { Usuario } from '../../interfaces/usuario';
import { UsuariosApi } from '../../servicios/usuarios/usuarios';
import { urlImagen } from '../../utilidades/imagen';
import { ListadoPaginado } from '../../utilidades/listado-paginado';

@Component({
  imports: [Aviso, CubreplatoLoading, VerMas, TranslatePipe],
  selector: 'app-dashboard-usuarios',
  templateUrl: './dashboard-usuarios.html',
})
export class DashboardUsuarios implements OnInit, OnDestroy {
  private api = inject(UsuariosApi);

  readonly urlImagen = urlImagen;
  readonly listado = new ListadoPaginado<Usuario>((offset) => this.api.listar(offset));

  ngOnInit() {
    this.listado.cargarMas();
  }

  ngOnDestroy() {
    this.listado.cancelar();
  }
}
