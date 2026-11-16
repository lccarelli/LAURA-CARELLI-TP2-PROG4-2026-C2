import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisoSesion } from './componentes/aviso-sesion/aviso-sesion';
import { AvisoActualizacion } from './componentes/aviso-actualizacion/aviso-actualizacion';
import { Barra } from './componentes/barra/barra';
import { PantallaCarga } from './componentes/pantalla-carga/pantalla-carga';
import { Sesion } from './servicios/sesion/sesion';

@Component({
  imports: [RouterOutlet, AvisoActualizacion, Barra, PantallaCarga, AvisoSesion],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly sesion = inject(Sesion);
}
