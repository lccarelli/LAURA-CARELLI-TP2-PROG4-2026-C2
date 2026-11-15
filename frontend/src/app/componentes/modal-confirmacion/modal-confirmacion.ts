import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-modal-confirmacion',
  templateUrl: './modal-confirmacion.html',
})
export class ModalConfirmacion {
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();
  readonly parametros = input<Record<string, string>>({});
  readonly confirmar = input.required<string>();
  readonly confirmando = input.required<string>();
  readonly cancelar = input('usuarios.cancelar');
  readonly peligroso = input(true);
  readonly enviando = input(false);
  readonly confirmado = output<void>();
  readonly cancelado = output<void>();

  private readonly botonCancelar =
    viewChild.required<ElementRef<HTMLButtonElement>>('cancelarBoton');

  constructor() {
    afterNextRender(() => this.botonCancelar().nativeElement.focus());
  }

  salir() {
    if (!this.enviando()) {
      this.cancelado.emit();
    }
  }
}
