import { Component, input } from '@angular/core';

const TRAZOS = {
  lupa: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  campana: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4',
  lapiz: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  tacho: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  chevron: 'M6 9l6 6 6-6',
  marcador: 'M7 4h10v16l-5-4-5 4V4z',
  telefono: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  birrete: 'M12 4l10 5-10 5L2 9l10-5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
  compartir: 'M4 12v7h16v-7M12 15V3M8 7l4-4 4 4',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  corazon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  comentario: 'M4 5h16v11H9l-5 4V5z',
  ojo: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  ojo_tachado:
    'M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 4M6.5 6.9C3.9 8.6 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
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
