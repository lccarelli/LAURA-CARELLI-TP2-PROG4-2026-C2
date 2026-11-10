import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Sesion } from '../../servicios/sesion/sesion';

@Component({
  imports: [TranslatePipe],
  selector: 'app-aviso-sesion',
  templateUrl: './aviso-sesion.html',
})
export class AvisoSesion {
  protected readonly sesion = inject(Sesion);

  protected readonly tiempo = computed(() => {
    const total = this.sesion.segundosRestantes() ?? 0;
    const minutos = Math.floor(total / 60);
    const segundos = String(total % 60).padStart(2, '0');
    return `${minutos}:${segundos}`;
  });
}
