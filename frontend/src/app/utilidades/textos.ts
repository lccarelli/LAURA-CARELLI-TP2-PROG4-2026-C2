const PUNTUACION_FINAL = ' ,;:\n\t';

function sinPuntuacionFinal(texto: string) {
  let fin = texto.length;
  while (fin > 0 && PUNTUACION_FINAL.includes(texto[fin - 1])) {
    fin--;
  }
  return texto.slice(0, fin);
}

export function acortar(texto: string, maximo: number, enPalabra = false) {
  const letras = Array.from(texto);
  if (letras.length <= maximo) {
    return texto;
  }
  let corte = letras.slice(0, maximo - 1).join('');
  if (enPalabra && letras[maximo - 1] !== ' ') {
    const espacio = corte.lastIndexOf(' ');
    if (espacio >= maximo / 2) {
      corte = corte.slice(0, espacio);
    }
  }
  return `${enPalabra ? sinPuntuacionFinal(corte) : corte.trimEnd()}…`;
}
