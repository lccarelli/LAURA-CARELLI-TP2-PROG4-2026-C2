import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export const ESPERA_EN_VISTA_MS = 1500;

@Directive({ selector: '[appEnVista]', exportAs: 'enVista' })
export class EnVista {
  readonly activa = input(true);
  readonly permanece = output<void>();
  readonly esperando = signal(false);

  private espera: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      if (!this.activa()) {
        this.dejarDeEsperar();
      }
    });

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observador = new IntersectionObserver(([entrada]) => {
      this.dejarDeEsperar();
      if (entrada.isIntersecting && this.activa()) {
        this.esperando.set(true);
        this.espera = setTimeout(() => {
          this.dejarDeEsperar();
          this.permanece.emit();
        }, ESPERA_EN_VISTA_MS);
      }
    });
    observador.observe(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => {
      this.dejarDeEsperar();
      observador.disconnect();
    });
  }

  private dejarDeEsperar() {
    clearTimeout(this.espera);
    this.esperando.set(false);
  }
}
