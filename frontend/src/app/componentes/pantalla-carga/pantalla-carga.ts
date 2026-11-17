import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LogoCargando } from '../logo-cargando/logo-cargando';

export const SEGUNDOS_HASTA_AVISO = 4;

@Component({
  imports: [LogoCargando, TranslatePipe],
  selector: 'app-pantalla-carga',
  templateUrl: './pantalla-carga.html',
})
export class PantallaCarga {
  protected readonly lento = signal(false);

  constructor() {
    const aviso = setTimeout(() => this.lento.set(true), SEGUNDOS_HASTA_AVISO * 1000);
    inject(DestroyRef).onDestroy(() => clearTimeout(aviso));
  }
}
