import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Publicacion } from '../../interfaces/publicacion';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { Icono } from '../icono/icono';
import { UltimosComentarios } from '../ultimos-comentarios/ultimos-comentarios';

@Component({
  imports: [FechaRelativa, Icono, RouterLink, TranslatePipe, UltimosComentarios],
  selector: 'app-ultima-publicacion',
  templateUrl: './ultima-publicacion.html',
})
export class UltimaPublicacion {
  readonly publicacion = input.required<Publicacion>();
}
