import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Auth } from '../../servicios/auth/auth';
import { Buscador } from '../buscador/buscador';
import { Campanita } from '../campanita/campanita';

@Component({
  imports: [Buscador, Campanita],
  selector: 'app-barra-superior',
  templateUrl: './barra-superior.html',
})
export class BarraSuperior {
  protected auth = inject(Auth);
  private router = inject(Router);

  protected readonly q = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.busquedaDeLaUrl()),
    ),
    { initialValue: this.busquedaDeLaUrl() },
  );

  protected buscar(texto: string) {
    this.router.navigate(['/publicaciones'], { queryParams: { q: texto || null } });
  }

  private busquedaDeLaUrl() {
    const url = this.router.parseUrl(this.router.url);
    const ruta = url.root.children['primary']?.segments.map(({ path }) => path).join('/');
    return ruta === 'publicaciones' ? (url.queryParamMap.get('q') ?? '') : '';
  }
}
