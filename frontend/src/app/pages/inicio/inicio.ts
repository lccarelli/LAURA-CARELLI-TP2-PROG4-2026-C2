import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { Publicacion } from '../../interfaces/publicacion';

const UN_DIA = 24 * 60 * 60 * 1000;

@Component({
  imports: [RouterLink, TranslatePipe, TarjetaPublicacion],
  selector: 'app-inicio',
  templateUrl: './inicio.html',
})
export class Inicio {
  private traductor = inject(TranslateService);

  protected publicaciones = computed<Publicacion[]>(() => {
    const ahora = Date.now();
    return [
      {
        _id: 'ejemplo-1',
        cantidadMeGusta: 24,
        cantidadComentarios: 3,
        usuario: { _id: 'ejemplo-u1', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' },
        tipo: 'receta',
        titulo: this.traductor.instant('inicio.ejemplo_1_titulo'),
        mensaje: this.traductor.instant('inicio.ejemplo_1_mensaje'),
        imagen: '/demo/galletitas-1.jpg',
        fecha: new Date(ahora).toISOString(),
      },
      {
        _id: 'ejemplo-2',
        cantidadMeGusta: 12,
        cantidadComentarios: 1,
        usuario: { _id: 'ejemplo-u2', nombre: 'Juan', apellido: 'Pérez', nombreUsuario: 'juan_p' },
        tipo: 'tip',
        titulo: this.traductor.instant('inicio.ejemplo_3_titulo'),
        mensaje: this.traductor.instant('inicio.ejemplo_3_mensaje'),
        fecha: new Date(ahora - UN_DIA).toISOString(),
      },
      {
        _id: 'ejemplo-3',
        cantidadMeGusta: 31,
        cantidadComentarios: 5,
        usuario: { _id: 'ejemplo-u1', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' },
        tipo: 'experiencia',
        titulo: this.traductor.instant('inicio.ejemplo_2_titulo'),
        mensaje: this.traductor.instant('inicio.ejemplo_2_mensaje'),
        imagen: '/demo/galletitas-2.jpg',
        fecha: new Date(ahora - 2 * UN_DIA).toISOString(),
      },
      {
        _id: 'ejemplo-4',
        cantidadMeGusta: 18,
        cantidadComentarios: 2,
        usuario: { _id: 'ejemplo-u2', nombre: 'Juan', apellido: 'Pérez', nombreUsuario: 'juan_p' },
        tipo: 'experiencia',
        titulo: this.traductor.instant('inicio.ejemplo_4_titulo'),
        mensaje: this.traductor.instant('inicio.ejemplo_4_mensaje'),
        fecha: new Date(ahora - 3 * UN_DIA).toISOString(),
      },
    ];
  });
}
