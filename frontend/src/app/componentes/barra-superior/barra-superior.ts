import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Auth } from '../../servicios/auth/auth';
import { Desplazamiento } from '../../servicios/desplazamiento/desplazamiento';
import { Buscador } from '../buscador/buscador';
import { Campanita } from '../campanita/campanita';

const INICIO = 'home';
const PUBLICACIONES = 'publicaciones';
const MIS_PUBLICACIONES = 'perfil/publicaciones';
const GUARDADAS = 'perfil/guardadas';
const BUSCABLES: Record<string, string> = {
  [PUBLICACIONES]: 'buscador.placeholder',
  [MIS_PUBLICACIONES]: 'buscador.placeholder_mias',
  [GUARDADAS]: 'buscador.placeholder_guardadas',
};

@Component({
  imports: [Buscador, Campanita],
  selector: 'app-barra-superior',
  templateUrl: './barra-superior.html',
})
export class BarraSuperior {
  protected auth = inject(Auth);
  protected desplazamiento = inject(Desplazamiento);
  private router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.router.parseUrl(this.router.url)),
    ),
    { initialValue: this.router.parseUrl(this.router.url) },
  );
  private readonly ruta = computed(
    () =>
      this.url()
        .root.children['primary']?.segments.map(({ path }) => path)
        .join('/') ?? '',
  );

  protected readonly q = computed(() =>
    this.ruta() in BUSCABLES ? (this.url().queryParamMap.get('q') ?? '') : '',
  );
  protected readonly conBuscador = computed(() => this.ruta() !== INICIO);
  protected readonly descripcion = computed(
    () => BUSCABLES[this.ruta()] ?? BUSCABLES[PUBLICACIONES],
  );

  protected buscar(texto: string) {
    const destino = this.ruta() in BUSCABLES ? this.ruta() : PUBLICACIONES;
    this.router.navigate([`/${destino}`], { queryParams: { q: texto || null } });
  }
}
