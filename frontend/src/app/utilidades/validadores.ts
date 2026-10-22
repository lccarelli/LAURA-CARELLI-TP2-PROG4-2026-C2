import { AbstractControl, ValidationErrors } from '@angular/forms';

export const PATRON_CLAVE = /^(?=.*[A-Z])(?=.*\d).{8,12}$/;
export const PATRON_NOMBRE_USUARIO = /^[a-zA-Z0-9_]{3,20}$/;

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
