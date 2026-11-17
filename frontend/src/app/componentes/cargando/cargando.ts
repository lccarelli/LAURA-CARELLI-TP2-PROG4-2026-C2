import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Carga } from '../../servicios/carga/carga';
import { LogoCargando } from '../logo-cargando/logo-cargando';

@Component({
  imports: [LogoCargando, TranslatePipe],
  selector: 'app-cargando',
  templateUrl: './cargando.html',
})
export class Cargando {
  protected carga = inject(Carga);
}
