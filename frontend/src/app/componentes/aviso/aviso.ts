import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icono } from '../icono/icono';

@Component({
  imports: [TranslatePipe, Icono],
  selector: 'app-aviso',
  templateUrl: './aviso.html',
})
export class Aviso {
  readonly titulo = input('comun.aviso');
  readonly info = input(false);
  readonly cerrar = output<void>();
}
