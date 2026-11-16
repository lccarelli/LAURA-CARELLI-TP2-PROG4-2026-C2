import { Directive, model, signal } from '@angular/core';

@Directive({
  selector: '[appResaltar]',
  host: {
    '(mouseenter)': 'resaltado.set(true)',
    '(mouseleave)': 'resaltado.set(false)',
    '[class.resaltado]': 'resaltado()',
    '[style.--color-resaltado]': 'color() || null',
  },
})
export class Resaltar {
  readonly color = model('', { alias: 'appResaltar' });
  protected readonly resaltado = signal(false);
}
