import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs';
import { Desplazamiento } from '../../servicios/desplazamiento/desplazamiento';
import { AvisosPush } from '../../servicios/avisos-push/avisos-push';
import { Auth } from '../../servicios/auth/auth';
import { Idioma } from '../../servicios/idioma/idioma';
import { Icono } from '../icono/icono';

@Component({
  imports: [Icono, RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-barra',
  templateUrl: './barra.html',
})
export class Barra {
  protected auth = inject(Auth);
  protected idioma = inject(Idioma);
  private avisosPush = inject(AvisosPush);
  private router = inject(Router);
  protected desplazamiento = inject(Desplazamiento);

  private readonly ruta = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(({ urlAfterRedirects }) => urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );
  protected readonly enPerfil = computed(
    () => this.ruta().startsWith('/perfil') && !this.ruta().startsWith('/perfil/guardadas'),
  );

  async salir() {
    await this.avisosPush.desvincular();
    this.auth.salir();
    this.router.navigate(['/']);
  }
}
