import { Component, inject } from '@angular/core';
import { Auth } from '../../servicios/auth/auth';

@Component({
  imports: [],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones {
  protected auth = inject(Auth);
}
