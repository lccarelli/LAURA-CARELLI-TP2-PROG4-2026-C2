import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-modal',
  templateUrl: './modal.html',
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
})
export class Modal {
  readonly titulo = input('Aviso');
  readonly cerrar = output<void>();
}
