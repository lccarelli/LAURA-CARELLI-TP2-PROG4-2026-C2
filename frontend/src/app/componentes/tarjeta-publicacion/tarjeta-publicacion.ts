import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Resaltar } from '../../directivas/resaltar/resaltar';
import { Publicacion, Tipo } from '../../interfaces/publicacion';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { urlImagen } from '../../utilidades/imagen';
import { BotonCompartir } from '../boton-compartir/boton-compartir';
import { BotonGuardar } from '../boton-guardar/boton-guardar';
import { BotonMeGusta } from '../boton-me-gusta/boton-me-gusta';
import { Icono } from '../icono/icono';
import { PortadaGenerica } from '../portada-generica/portada-generica';

const COLOR_DE_TIPO: Record<Tipo, string> = {
  receta: 'var(--tema-torta-1)',
  tip: 'var(--tema-torta-2)',
  experiencia: 'var(--tema-torta-3)',
};

@Component({
  imports: [
    BotonCompartir,
    BotonGuardar,
    BotonMeGusta,
    NgTemplateOutlet,
    FechaRelativa,
    PortadaGenerica,
    RouterLink,
    TranslatePipe,
    Icono,
  ],
  selector: 'app-tarjeta-publicacion',
  templateUrl: './tarjeta-publicacion.html',
  host: { class: 'pin-contenedor' },
  hostDirectives: [Resaltar],
})
export class TarjetaPublicacion {
  private resaltar = inject(Resaltar);

  readonly publicacion = input.required<Publicacion>();
  readonly soloLectura = input(false);
  readonly desguardada = output<string>();

  constructor() {
    effect(() => this.resaltar.color.set(COLOR_DE_TIPO[this.publicacion().tipo]));
  }

  protected readonly compartidaCon = signal<number | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  protected urlImagen = urlImagen;
}
