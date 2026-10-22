import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Barra } from './componentes/barra/barra';

@Component({
  imports: [RouterOutlet, Barra],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
