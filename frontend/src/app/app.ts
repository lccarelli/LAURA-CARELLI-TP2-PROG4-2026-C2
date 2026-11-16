import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisoSesion } from './componentes/aviso-sesion/aviso-sesion';
import { AvisoActualizacion } from './componentes/aviso-actualizacion/aviso-actualizacion';
import { BarraSuperior } from './componentes/barra-superior/barra-superior';
import { Barra } from './componentes/barra/barra';
import { PantallaCarga } from './componentes/pantalla-carga/pantalla-carga';
import { Sesion } from './servicios/sesion/sesion';

@Component({
  imports: [RouterOutlet, AvisoActualizacion, Barra, BarraSuperior, PantallaCarga, AvisoSesion],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly sesion = inject(Sesion);
}
