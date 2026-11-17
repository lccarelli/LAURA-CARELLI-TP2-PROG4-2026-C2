import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';

const ANCHO_DE_ESCRITORIO = '(min-width: 768px)';
const CANDIDATAS = 12;
const FOTOS_MINIMAS = 3;
const FOTOS_VISIBLES = 5;

interface FotoDelPanel {
  imagen: string;
  titulo?: string;
  autor?: string;
  enlace?: string;
}

const COMIDAS = ['locro-y-empanadas', 'asado', 'locro', 'alfajores', 'humitas'].map((archivo) => ({
  imagen: `comidas/${archivo}.jpg`,
}));

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-panel-publicaciones',
  host: { class: 'panel-publicaciones' },
  templateUrl: './panel-publicaciones.html',
})
export class PanelPublicaciones {
  readonly fotos = signal<FotoDelPanel[]>(COMIDAS);
  readonly conPublicaciones = signal(false);

  constructor() {
    if (!globalThis.matchMedia?.(ANCHO_DE_ESCRITORIO).matches) {
      return;
    }
    inject(PublicacionesApi)
      .listarPublico(CANDIDATAS)
      .subscribe({
        next: ({ datos }) => {
          const reales = datos
            .filter(({ imagen }) => imagen)
            .slice(0, FOTOS_VISIBLES)
            .map(({ _id, imagen, titulo, usuario }) => ({
              imagen: imagen!,
              titulo,
              autor: usuario.nombreUsuario,
              enlace: `/publico/${_id}`,
            }));
          if (reales.length >= FOTOS_MINIMAS) {
            this.fotos.set(reales);
            this.conPublicaciones.set(true);
          }
        },
        error: () => this.conPublicaciones.set(false),
      });
  }
}
