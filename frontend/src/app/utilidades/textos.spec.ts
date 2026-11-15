import { acortar } from './textos';

describe('acortar', () => {
  it('[O] un texto más largo que el máximo se corta y termina en puntos suspensivos', () => {
    expect(acortar('Milanesas de berenjena al horno', 12)).toBe('Milanesas d…');
  });

  it('[B] un texto de justo el máximo no se toca y uno de un carácter más sí', () => {
    expect(acortar('abcde', 5)).toBe('abcde');
    expect(acortar('abcdef', 5)).toBe('abcd…');
  });

  it('[Z] un texto vacío queda vacío', () => {
    expect(acortar('', 5)).toBe('');
  });

  it('[B] no deja un espacio antes de los puntos suspensivos', () => {
    expect(acortar('Pan casero rico', 5)).toBe('Pan…');
  });

  it('[I] no parte un carácter que ocupa dos unidades, como un emoji', () => {
    expect(acortar('🍰🍰🍰🍰', 3)).toBe('🍰🍰…');
  });
});
