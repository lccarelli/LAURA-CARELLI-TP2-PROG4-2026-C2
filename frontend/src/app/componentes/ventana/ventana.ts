import { AfterViewInit, Component, ElementRef, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-ventana',
  templateUrl: './ventana.html',
  host: { '(document:keydown.escape)': 'alEscapar()' },
})
export class Ventana implements AfterViewInit {
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly titulo = input.required<string>();
  readonly escape = input(true);
  readonly completa = input(false);
  readonly cerrar = output<void>();

  ngAfterViewInit() {
    const raiz = this.elemento.nativeElement;
    const campo =
      raiz.querySelector<HTMLElement>('[data-foco]') ?? raiz.querySelector<HTMLElement>('.ventana');
    campo?.focus();
  }

  protected alEscapar() {
    if (this.escape()) {
      this.cerrar.emit();
    }
  }
}
