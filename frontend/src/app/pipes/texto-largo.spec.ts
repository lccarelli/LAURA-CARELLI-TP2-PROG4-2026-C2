import { TextoLargo } from './texto-largo';

describe('TextoLargo', () => {
  const pipe = new TextoLargo();

  it('[O] un texto largo se corta en una palabra y termina en puntos suspensivos', () => {
    expect(pipe.transform('Crocantes por fuera y blandas por dentro', 25)).toBe(
      'Crocantes por fuera y…',
    );
  });

  it('[B] un texto de justo el máximo no se toca y uno de un carácter más sí', () => {
    expect(pipe.transform('uno dos tres cuatro', 19)).toBe('uno dos tres cuatro');
    expect(pipe.transform('uno dos tres cuatro', 18)).toBe('uno dos tres…');
  });

  it('[Z] un texto corto queda igual', () => {
    expect(pipe.transform('Hola', 100)).toBe('Hola');
  });

  it.each([
    ['sin texto', undefined],
    ['texto nulo', null],
    ['texto vacío', ''],
  ])('[E] %s devuelve texto vacío', (_caso, texto) => {
    expect(pipe.transform(texto, 10)).toBe('');
  });

  it('[I] el resultado nunca supera el máximo', () => {
    const texto = 'Pasalas dos veces por el pan rallado y dejalas reposar diez minutos';

    for (let maximo = 5; maximo < texto.length; maximo++) {
      expect(Array.from(pipe.transform(texto, maximo)).length).toBeLessThanOrEqual(maximo);
    }
  });
});
