import { AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

export const PATRON_CLAVE = /^(?=.*[A-Z])(?=.*\d).{8,12}$/;
export const PATRON_NOMBRE_USUARIO = /^\w{3,20}$/;

export function clavesIguales(grupo: AbstractControl): ValidationErrors | null {
  const clave = grupo.get('clave')?.value;
  const repetirClave = grupo.get('repetirClave')?.value;

  return clave === repetirClave ? null : { clavesDistintas: true };
}

export function fechaPasada(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  return new Date(control.value) > new Date() ? { fechaFutura: true } : null;
}

export function mensajeDeLargo(
  control: AbstractControl | null,
  traductor: TranslateService,
): string | null {
  const errores = control?.touched ? control.errors : null;
  if (errores?.['required']) {
    return traductor.instant('comun.obligatorio');
  }
  if (errores?.['minlength']) {
    return traductor.instant('validacion.minimo', { n: errores['minlength'].requiredLength });
  }
  if (errores?.['maxlength']) {
    return traductor.instant('validacion.maximo', { n: errores['maxlength'].requiredLength });
  }
  return null;
}
