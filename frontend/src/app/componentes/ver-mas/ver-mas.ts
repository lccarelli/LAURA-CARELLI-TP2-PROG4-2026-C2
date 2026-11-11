import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EnVista } from '../../directivas/en-vista/en-vista';

@Component({
  imports: [EnVista, TranslatePipe],
  selector: 'app-ver-mas',
  templateUrl: './ver-mas.html',
})
export class VerMas {
  readonly texto = input.required<string>();
  readonly automatico = input(true);
  readonly cargar = output<void>();
}
