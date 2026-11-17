export const LETRAS_DEL_INDICE = [
  ...'ABCDEFGHIJKLMN',
  'Ñ',
  ...'OPQRSTUVWXYZ',
  '#',
] as const;

export type LetraDelIndice = (typeof LETRAS_DEL_INDICE)[number];

export function inicialDe(texto: string): LetraDelIndice {
  const primera = texto.trim().charAt(0).toLocaleUpperCase('es');
  if (primera === 'Ñ') {
    return 'Ñ';
  }
  const sinTilde = primera.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return /^[A-Z]$/.test(sinTilde) ? (sinTilde as LetraDelIndice) : '#';
}

const colador = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export const compararTitulos = (a: string, b: string) =>
  colador.compare(a.trim(), b.trim());
