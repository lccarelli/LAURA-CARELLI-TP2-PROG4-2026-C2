import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ListaCompartidas } from '../../componentes/lista-compartidas/lista-compartidas';
import { UltimaPublicacion } from '../../componentes/ultima-publicacion/ultima-publicacion';
import { Tablero } from '../../componentes/tablero/tablero';
import { Icono } from '../../componentes/icono/icono';
import { Publicacion } from '../../interfaces/publicacion';
import { Edad } from '../../pipes/edad';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { urlImagen } from '../../utilidades/imagen';
import { recordarAltura } from '../../utilidades/recordar-posicion';

const PORTADAS_DEL_COLLAGE = 3;
const PUBLICACIONES_A_REVISAR = 12;
export const ULTIMAS_PUBLICACIONES = 3;

const conImagen = (publicaciones: Publicacion[]) =>
  publicaciones.flatMap(({ imagen }) => (imagen ? [imagen] : []));

@Component({
  imports: [
    DatePipe,
    Edad,
    Icono,
    ListaCompartidas,
    RouterLink,
    Tablero,
    TranslatePipe,
    UltimaPublicacion,
  ],
  selector: 'app-perfil',
  templateUrl: './perfil.html',
})
export class Perfil {
  private api = inject(PublicacionesApi);
  private ruta = inject(ActivatedRoute);

  protected auth = inject(Auth);
  protected urlImagen = urlImagen;

  private readonly recientes = signal<string[]>([]);
  private readonly guardadas = signal<string[]>([]);
  readonly ultimas = signal<Publicacion[]>([]);
  readonly sinVer = signal(0);
  protected readonly destacada = toSignal(
    this.ruta.queryParamMap.pipe(map((parametros) => parametros.get('publicacion'))),
    { initialValue: null },
  );
  protected readonly enCompartidos = toSignal(
    this.ruta.queryParamMap.pipe(map((parametros) => parametros.get('solapa') === 'compartidos')),
    { initialValue: false },
  );
  readonly portadas = computed(() => this.recientes().slice(0, PORTADAS_DEL_COLLAGE));
  readonly portadasGuardadas = computed(() => this.guardadas().slice(0, PORTADAS_DEL_COLLAGE));

  private readonly idDeUsuario = computed(() => this.auth.usuario()?._id);

  constructor() {
    if (!inject(Router).url.includes('solapa=compartidos')) {
      recordarAltura();
    }
    effect(() => {
      const id = this.idDeUsuario();
      if (id) {
        untracked(() => this.cargarPortadas(id));
        untracked(() => this.cargarGuardadas());
        untracked(() => this.cargarSinVer());
      }
    });
  }

  private cargarSinVer() {
    this.api.compartidasSinVer().subscribe({
      next: ({ cantidad }) => this.sinVer.set(cantidad),
      error: () => this.sinVer.set(0),
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
