import { Component, input } from '@angular/core';

const TRAZOS = {
  cerrar: 'M6 6l12 12M18 6L6 18',
  corazon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  comentario: 'M4 5h16v11H9l-5 4V5z',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

@Component({
  selector: 'app-icono',
  templateUrl: './icono.html',
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly chico = input(false);
  readonly relleno = input(false);

  protected readonly trazos = TRAZOS;
}
