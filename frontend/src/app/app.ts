import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Barra } from './componentes/barra/barra';
import { PantallaCarga } from './componentes/pantalla-carga/pantalla-carga';
import { Sesion } from './servicios/sesion/sesion';

@Component({
  imports: [RouterOutlet, Barra, PantallaCarga],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly sesion = inject(Sesion);
}
