import { baseDeNombreDeUsuario, conSufijo } from './nombre-de-usuario.js';

describe('baseDeNombreDeUsuario', () => {
  it.each([
    ['laura@gmail.com', 'laura'],
    ['laura.carelli@gmail.com', 'laura_carelli'],
    ['laura+soto@gmail.com', 'laura_soto'],
    ['josé@gmail.com', 'jose'],
    ['ñandú.perez@gmail.com', 'nandu_perez'],
  ])('[O] %s da «%s»', (correo, esperado) => {
    expect(baseDeNombreDeUsuario(correo)).toBe(esperado);
  });

  it('[B] corta a 20 caracteres', () => {
    expect(baseDeNombreDeUsuario(`${'a'.repeat(40)}@gmail.com`)).toHaveLength(
      20,
    );
  });

  it.each(['a@gmail.com', 'ab@gmail.com', '@gmail.com'])(
    '[B] si queda de menos de 3 caracteres (%s) usa «usuario»',
    (correo) => {
      expect(baseDeNombreDeUsuario(correo)).toBe('usuario');
    },
  );

  it('[I] el resultado siempre cumple el formato del registro: de 3 a 20, letras, números o guion bajo', () => {
    for (const correo of [
      'x.y.z@a.com',
      'ä@a.com',
      'a-b-c-d@a.com',
      '日本語@a.com',
    ]) {
      expect(baseDeNombreDeUsuario(correo)).toMatch(/^\w{3,20}$/);
    }
  });
});

describe('conSufijo', () => {
  it('[Z] con 0 deja el nombre como está', () => {
    expect(conSufijo('laura', 0)).toBe('laura');
  });

  it('[O] con un número lo agrega al final', () => {
    expect(conSufijo('laura', 2)).toBe('laura2');
  });

  it('[B] si ya tiene 20 caracteres recorta para que el resultado siga siendo de 20', () => {
    const resultado = conSufijo('a'.repeat(20), 12);

    expect(resultado).toHaveLength(20);
    expect(resultado.endsWith('12')).toBe(true);
  });
});
