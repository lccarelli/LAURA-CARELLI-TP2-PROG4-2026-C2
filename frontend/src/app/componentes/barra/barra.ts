import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../servicios/auth/auth';
import { Idioma } from '../../servicios/idioma/idioma';
import { Tema } from '../../servicios/tema/tema';
import { Icono } from '../icono/icono';

const DESPLAZAMIENTO_MINIMO = 8;

@Component({
  imports: [Icono, RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-barra',
  templateUrl: './barra.html',
  host: { '(window:scroll)': 'alDesplazar()' },
})
export class Barra {
  protected auth = inject(Auth);
  protected idioma = inject(Idioma);
  protected tema = inject(Tema);
  private router = inject(Router);
  private posicion = 0;

  protected subiendo = signal(false);

  alDesplazar() {
    const actual = Math.max(0, window.scrollY);
    const diferencia = actual - this.posicion;
    if (Math.abs(diferencia) < DESPLAZAMIENTO_MINIMO) {
      return;
    }
    this.subiendo.set(diferencia < 0);
    this.posicion = actual;
  }

  salir() {
    this.auth.salir();
    this.router.navigate(['/']);
  }
}
