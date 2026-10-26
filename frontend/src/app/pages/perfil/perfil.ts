import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../servicios/auth/auth';
import { urlImagen } from '../../utilidades/imagen';

@Component({
  imports: [DatePipe, TranslatePipe],
  selector: 'app-perfil',
  templateUrl: './perfil.html',
})
export class Perfil {
  protected auth = inject(Auth);
  protected urlImagen = urlImagen;
}
