import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AvisosPush } from '../../servicios/avisos-push/avisos-push';
import { Instalacion } from '../../servicios/instalacion/instalacion';

@Component({
  imports: [TranslatePipe],
  selector: 'app-avisos-del-dispositivo',
  templateUrl: './avisos-del-dispositivo.html',
})
export class AvisosDelDispositivo {
  protected readonly avisos = inject(AvisosPush);
  protected readonly instalacion = inject(Instalacion);
}
