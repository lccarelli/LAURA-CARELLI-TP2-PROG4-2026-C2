import { Component, inject, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AutoFoco } from '../../directivas/auto-foco/auto-foco';
import { mensajeDeLargo } from '../../utilidades/validadores';

@Component({
  imports: [AutoFoco, ReactiveFormsModule, TranslatePipe],
  selector: 'app-campos-personales',
  templateUrl: './campos-personales.html',
  host: { class: 'block' },
})
export class CamposPersonales {
  private traductor = inject(TranslateService);

  readonly grupo = input.required<FormGroup>();

  protected mensaje(campo: 'nombre' | 'apellido') {
    return mensajeDeLargo(this.grupo().get(campo), this.traductor);
  }
}
