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

  describe('por palabra', () => {
    it('[O] corta en el último espacio para no dejar una palabra a medias', () => {
      expect(acortar('Mezclar la harina con los huevos', 20, true)).toBe('Mezclar la harina…');
    });

    it('[B] si el corte cae justo al final de una palabra, la conserva', () => {
      expect(acortar('abc def ghi', 8, true)).toBe('abc def…');
    });

    it('[B] si la palabra ocupa casi todo el texto, corta dentro de ella en vez de dejar casi nada', () => {
      expect(acortar('Superlongitudinalmente largo', 10, true)).toBe('Superlong…');
    });

    it('[S] no deja una coma ni dos puntos antes de los puntos suspensivos', () => {
      expect(acortar('Harina, huevos y leche para mezclar', 15, true)).toBe('Harina, huevos…');
      expect(acortar('Ingredientes: harina y huevos', 14, true)).toBe('Ingredientes…');
    });

    it('[Z] un texto que entra no se toca', () => {
      expect(acortar('Pan', 10, true)).toBe('Pan');
    });
  });
});
