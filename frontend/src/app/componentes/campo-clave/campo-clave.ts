import { Component, ElementRef, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icono } from '../icono/icono';

@Component({
  imports: [Icono, TranslatePipe],
  selector: 'app-campo-clave',
  templateUrl: './campo-clave.html',
})
export class CampoClave {
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly visible = signal(false);

  alternar() {
    this.visible.update((valor) => !valor);
    const campo = this.elemento.nativeElement.querySelector('input');
    if (campo) {
      campo.type = this.visible() ? 'text' : 'password';
    }
  }
}
