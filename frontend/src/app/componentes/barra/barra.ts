import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../servicios/auth/auth';
import { Idioma } from '../../servicios/idioma/idioma';
import { Tema } from '../../servicios/tema/tema';

@Component({
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-barra',
  templateUrl: './barra.html',
})
export class Barra {
  protected auth = inject(Auth);
  protected idioma = inject(Idioma);
  protected tema = inject(Tema);
  private router = inject(Router);

  salir() {
    this.auth.salir();
    this.router.navigate(['/']);
  }
}
