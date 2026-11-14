import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EstadoVisible } from '../../utilidades/carga';
import { Aviso } from '../aviso/aviso';
import { CubreplatoLoading } from '../cubreplato-loading/cubreplato-loading';

@Component({
  imports: [Aviso, CubreplatoLoading, TranslatePipe],
  selector: 'app-seccion-estadistica',
  templateUrl: './seccion-estadistica.html',
})
export class SeccionEstadistica {
  readonly titulo = input.required<string>();
  readonly textoVacio = input.required<string>();
  readonly carga = input.required<EstadoVisible>();
  readonly reintentar = output<void>();
}
