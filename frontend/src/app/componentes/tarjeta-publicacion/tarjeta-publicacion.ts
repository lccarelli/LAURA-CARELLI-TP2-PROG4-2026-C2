import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Publicacion } from '../../interfaces/publicacion';
import { urlImagen } from '../../utilidades/imagen';

@Component({
  imports: [TranslatePipe],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
  host: { class: 'pin-contenedor' },
})
export class TarjetaPublicacion {
  readonly publicacion = input.required<Publicacion>();
  readonly abrir = output<void>();

  protected urlImagen = urlImagen;
}
