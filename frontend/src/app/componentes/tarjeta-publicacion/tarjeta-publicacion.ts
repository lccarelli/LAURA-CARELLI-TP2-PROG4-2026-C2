import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Publicacion } from '../../interfaces/publicacion';
import { urlImagen } from '../../utilidades/imagen';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
  host: { class: 'pin-contenedor' },
})
export class TarjetaPublicacion {
  readonly publicacion = input.required<Publicacion>();

  protected urlImagen = urlImagen;
}
