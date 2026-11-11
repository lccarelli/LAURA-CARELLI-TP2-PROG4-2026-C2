import { FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { VALIDADORES_COMENTARIO, errorDeComentario } from './comentario';

const traductor = {
  instant: (clave: string, parametros?: { n: number }) =>
    parametros ? `${clave}:${parametros.n}` : clave,
} as unknown as TranslateService;

const control = (valor: string, tocado = true) => {
  const nuevo = new FormControl(valor, VALIDADORES_COMENTARIO);
  if (tocado) {
    nuevo.markAsTouched();
  }
  return nuevo;
};

describe('errorDeComentario', () => {
  it('[Z] un campo que nadie tocó todavía no muestra error', () => {
    expect(errorDeComentario(control('', false), traductor)).toBeNull();
  });

  it('[O] un mensaje válido no tiene error', () => {
    expect(errorDeComentario(control('Hola'), traductor)).toBeNull();
  });

  it('[E] vacío o sólo espacios es obligatorio', () => {
    expect(errorDeComentario(control(''), traductor)).toBe('comun.obligatorio');
    expect(errorDeComentario(control('  \n '), traductor)).toBe('comun.obligatorio');
  });

  it('[B] 500 caracteres es válido y 501 supera el máximo', () => {
    expect(errorDeComentario(control('a'.repeat(500)), traductor)).toBeNull();
    expect(errorDeComentario(control('a'.repeat(501)), traductor)).toBe('validacion.maximo:500');
  });
});
