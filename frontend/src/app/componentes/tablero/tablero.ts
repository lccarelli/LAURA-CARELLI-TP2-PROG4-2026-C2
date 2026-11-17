import { Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-tablero',
  templateUrl: './tablero.html',
})
export class Tablero {
  readonly enlace = input.required<string>();
  readonly parametros = input<Params | null>(null);
  readonly titulo = input.required<string>();
  readonly detalle = input.required<string>();
  readonly portadas = input<string[]>([]);
}
