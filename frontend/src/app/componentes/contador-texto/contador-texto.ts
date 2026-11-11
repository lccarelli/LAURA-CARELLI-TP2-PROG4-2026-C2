import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-contador-texto',
  templateUrl: './contador-texto.html',
})
export class ContadorTexto {
  readonly cantidad = input.required<number>();
  readonly maximo = input.required<number>();
}
