import {
  afterNextRender,
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

const CAMPOS_DE_TEXTO =
  'textarea, select, input:not([type="checkbox"], [type="radio"], [type="file"], [type="button"], [type="submit"])';

@Directive({ selector: '[appAutoFoco]' })
export class AutoFoco {
  readonly activo = input(true, { alias: 'appAutoFoco', transform: booleanAttribute });

  constructor() {
    const elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      if (this.activo() && !abririaElTeclado(elemento)) {
        elemento.focus();
      }
    });
  }
}

function abririaElTeclado(elemento: HTMLElement) {
  return (
    elemento.matches(CAMPOS_DE_TEXTO) &&
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: coarse)').matches
  );
}
