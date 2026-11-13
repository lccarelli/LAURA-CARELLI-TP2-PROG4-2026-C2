export function acortar(texto: string, maximo: number) {
  const letras = Array.from(texto);
  return letras.length <= maximo
    ? texto
    : `${letras
        .slice(0, maximo - 1)
        .join('')
        .trimEnd()}…`;
}
