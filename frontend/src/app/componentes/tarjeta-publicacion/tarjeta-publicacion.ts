import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Publicacion } from '../../interfaces/publicacion';
import { urlImagen } from '../../utilidades/imagen';

@Component({
  imports: [DatePipe],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
})
export class TarjetaPublicacion {
  readonly publicacion = input.required<Publicacion>();

  protected urlImagen = urlImagen;
}
