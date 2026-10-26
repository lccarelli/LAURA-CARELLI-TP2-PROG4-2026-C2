import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-modal',
  templateUrl: './modal.html',
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
})
export class Modal {
  readonly titulo = input('comun.aviso');
  readonly cerrar = output<void>();
}
