import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AutoFoco } from '../../directivas/auto-foco/auto-foco';

@Component({
  imports: [AutoFoco, TranslatePipe],
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

  salir() {
    if (!this.enviando()) {
      this.cancelado.emit();
    }
  }
}
