import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CartelInstalar } from '../../componentes/cartel-instalar/cartel-instalar';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { Publicacion } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';

const PUBLICACIONES_VISIBLES = 8;

@Component({
  imports: [CartelInstalar, RouterLink, TranslatePipe, TarjetaPublicacion],
  selector: 'app-inicio',
  templateUrl: './inicio.html',
})
export class Inicio {
  readonly publicaciones = signal<Publicacion[]>([]);

  constructor() {
    inject(PublicacionesApi)
      .listarPublico(PUBLICACIONES_VISIBLES)
      .subscribe({
        next: ({ datos }) => this.publicaciones.set(datos),
        error: () => this.publicaciones.set([]),
      });
  }
}
