import { AbstractControl, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { MAXIMO_COMENTARIO } from '../interfaces/comentario';

export const VALIDADORES_COMENTARIO = [
  Validators.required,
  Validators.pattern(/\S/),
  Validators.maxLength(MAXIMO_COMENTARIO),
];

export function errorDeComentario(
  control: AbstractControl,
  traductor: TranslateService,
): string | null {
  if (!control.touched) {
    return null;
  }
  if (control.errors?.['required'] || control.errors?.['pattern']) {
    return traductor.instant('comun.obligatorio');
  }
  if (control.errors?.['maxlength']) {
    return traductor.instant('validacion.maximo', { n: MAXIMO_COMENTARIO });
  }
  return null;
}
