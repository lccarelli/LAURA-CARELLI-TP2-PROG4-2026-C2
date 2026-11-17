import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MuroPublicaciones } from '../../componentes/muro-publicaciones/muro-publicaciones';
import { OrdenPublicaciones, ORDENES, Tipo, TIPOS } from '../../interfaces/publicacion';

@Component({
  imports: [MuroPublicaciones, RouterLink, TranslatePipe],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit {
  private ruta = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  readonly busqueda = signal('');
  readonly tipo = signal<Tipo | null>(null);
  readonly orden = signal<OrdenPublicaciones>('fecha');

  ngOnInit() {
    this.ruta.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      const tipo = parametros.get('tipo');
      const orden = parametros.get('orden');
      this.busqueda.set(parametros.get('q') ?? '');
      this.tipo.set(TIPOS.find((opcion) => opcion === tipo) ?? null);
      this.orden.set(ORDENES.find((opcion) => opcion === orden) ?? 'fecha');
    });
  }
}
