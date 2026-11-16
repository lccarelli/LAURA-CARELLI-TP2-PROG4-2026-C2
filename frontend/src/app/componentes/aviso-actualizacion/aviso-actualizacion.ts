import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Actualizacion } from '../../servicios/actualizacion/actualizacion';
import { Aviso } from '../aviso/aviso';

@Component({
  imports: [Aviso, TranslatePipe],
  selector: 'app-aviso-actualizacion',
  templateUrl: './aviso-actualizacion.html',
})
export class AvisoActualizacion {
  protected readonly actualizacion = inject(Actualizacion);
  protected readonly descartado = signal(false);
}
