import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { UltimosComentarios } from '../../componentes/ultimos-comentarios/ultimos-comentarios';
import { Tablero } from '../../componentes/tablero/tablero';
import { Icono } from '../../componentes/icono/icono';
import { Publicacion } from '../../interfaces/publicacion';
import { Edad } from '../../pipes/edad';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { urlImagen } from '../../utilidades/imagen';

const PORTADAS_DEL_COLLAGE = 3;
const PUBLICACIONES_A_REVISAR = 12;
export const ULTIMAS_PUBLICACIONES = 3;

const conImagen = (publicaciones: Publicacion[]) =>
  publicaciones.flatMap(({ imagen }) => (imagen ? [imagen] : []));

@Component({
  imports: [
    DatePipe,
    Edad,
    FechaRelativa,
    Icono,
    RouterLink,
    Tablero,
    TranslatePipe,
    UltimosComentarios,
  ],
  selector: 'app-perfil',
  templateUrl: './perfil.html',
})
export class Perfil {
  private api = inject(PublicacionesApi);

  protected auth = inject(Auth);
  protected urlImagen = urlImagen;

  private readonly recientes = signal<string[]>([]);
  private readonly guardadas = signal<string[]>([]);
  readonly ultimas = signal<Publicacion[]>([]);
  readonly portadas = computed(() => this.recientes().slice(0, PORTADAS_DEL_COLLAGE));
  readonly portadasGuardadas = computed(() => this.guardadas().slice(0, PORTADAS_DEL_COLLAGE));

  private readonly idDeUsuario = computed(() => this.auth.usuario()?._id);

  constructor() {
    effect(() => {
      const id = this.idDeUsuario();
      if (id) {
        untracked(() => this.cargarPortadas(id));
        untracked(() => this.cargarGuardadas());
      }
    });
  }

  private cargarGuardadas() {
    this.api.listarGuardadas(0, PUBLICACIONES_A_REVISAR).subscribe({
      next: ({ datos }) => this.guardadas.set(conImagen(datos)),
      error: () => this.guardadas.set([]),
    });
  }

  private cargarPortadas(id: string) {
    this.api.listar(0, PUBLICACIONES_A_REVISAR, 'fecha', id).subscribe({
      next: ({ datos }) => {
        this.recientes.set(conImagen(datos));
        this.ultimas.set(datos.slice(0, ULTIMAS_PUBLICACIONES));
      },
      error: () => {
        this.recientes.set([]);
        this.ultimas.set([]);
      },
    });
  }
}
