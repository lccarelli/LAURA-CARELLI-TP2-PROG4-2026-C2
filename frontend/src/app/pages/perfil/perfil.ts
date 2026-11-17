import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Icono } from '../../componentes/icono/icono';
import { Edad } from '../../pipes/edad';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { urlImagen } from '../../utilidades/imagen';

const PORTADAS_DEL_COLLAGE = 3;
const PUBLICACIONES_A_REVISAR = 12;

@Component({
  imports: [DatePipe, Edad, Icono, RouterLink, TranslatePipe],
  selector: 'app-perfil',
  templateUrl: './perfil.html',
})
export class Perfil {
  private api = inject(PublicacionesApi);

  protected auth = inject(Auth);
  protected urlImagen = urlImagen;

  private readonly recientes = signal<string[]>([]);
  readonly portadas = computed(() => this.recientes().slice(0, PORTADAS_DEL_COLLAGE));

  private readonly idDeUsuario = computed(() => this.auth.usuario()?._id);

  constructor() {
    effect(() => {
      const id = this.idDeUsuario();
      if (id) {
        untracked(() => this.cargarPortadas(id));
      }
    });
  }

  private cargarPortadas(id: string) {
    this.api.listar(0, PUBLICACIONES_A_REVISAR, 'fecha', id).subscribe({
      next: ({ datos }) =>
        this.recientes.set(datos.flatMap(({ imagen }) => (imagen ? [imagen] : []))),
      error: () => this.recientes.set([]),
    });
  }
}
