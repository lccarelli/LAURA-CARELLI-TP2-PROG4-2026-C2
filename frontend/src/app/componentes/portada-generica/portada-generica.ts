import { Component, input } from '@angular/core';
import { Tipo } from '../../interfaces/publicacion';

@Component({
  selector: 'app-portada-generica',
  templateUrl: './portada-generica.html',
})
export class PortadaGenerica {
  readonly tipo = input.required<Tipo>();
  readonly chica = input(false);
}
