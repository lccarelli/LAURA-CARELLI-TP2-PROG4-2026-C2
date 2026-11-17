import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Instalacion } from '../../servicios/instalacion/instalacion';
import { Icono } from '../icono/icono';

@Component({
  imports: [Icono, TranslatePipe],
  selector: 'app-cartel-instalar',
  templateUrl: './cartel-instalar.html',
})
export class CartelInstalar {
  protected instalacion = inject(Instalacion);

  protected async instalar() {
    await this.instalacion.instalar();
  }
}
