import { Component, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MuroPublicaciones } from '../../componentes/muro-publicaciones/muro-publicaciones';
import { LetraDelIndice, LETRAS_DEL_INDICE } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';

@Component({
  imports: [MuroPublicaciones, RouterLink, TranslatePipe],
  selector: 'app-guardadas',
  templateUrl: './guardadas.html',
})
export class Guardadas implements OnInit {
  private api = inject(PublicacionesApi);
  private ruta = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  protected readonly letras = LETRAS_DEL_INDICE;
  readonly busqueda = signal('');
  readonly letra = signal<LetraDelIndice | null>(null);
  readonly cantidades = signal<Record<string, number>>({});
  readonly total = signal(0);

  constructor() {
    effect(() => {
      const q = this.busqueda();
      untracked(() => this.cargarLetras(q));
    });
  }

  ngOnInit() {
    this.ruta.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      this.busqueda.set(parametros.get('q') ?? '');
      this.letra.set(null);
    });
  }

  elegir(letra: LetraDelIndice | null) {
    this.letra.set(letra === this.letra() ? null : letra);
  }

  hay(letra: LetraDelIndice) {
    return (this.cantidades()[letra] ?? 0) > 0;
  }

  alQuitar() {
    this.cargarLetras(this.busqueda());
  }

  private cargarLetras(q: string) {
    this.api.letrasGuardadas(q || undefined).subscribe({
      next: ({ letras, total }) => {
        this.cantidades.set(letras);
        this.total.set(total);
      },
      error: () => this.cantidades.set({}),
    });
  }
}
