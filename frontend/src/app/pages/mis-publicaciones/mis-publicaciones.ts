import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MuroPublicaciones } from '../../componentes/muro-publicaciones/muro-publicaciones';
import { Auth } from '../../servicios/auth/auth';

@Component({
  imports: [MuroPublicaciones, RouterLink, TranslatePipe],
  selector: 'app-mis-publicaciones',
  templateUrl: './mis-publicaciones.html',
})
export class MisPublicaciones implements OnInit {
  private ruta = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  protected auth = inject(Auth);
  readonly busqueda = signal('');

  ngOnInit() {
    this.ruta.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parametros) => this.busqueda.set(parametros.get('q') ?? ''));
  }
}
