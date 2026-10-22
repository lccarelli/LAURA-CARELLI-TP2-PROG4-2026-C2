import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../servicios/auth/auth';

@Component({
  imports: [RouterLink],
  selector: 'app-barra',
  templateUrl: './barra.html',
})
export class Barra {
  protected auth = inject(Auth);
  private router = inject(Router);

  salir() {
    this.auth.salir();
    this.router.navigate(['/login']);
  }
}
