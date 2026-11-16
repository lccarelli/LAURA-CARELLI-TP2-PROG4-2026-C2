import { Transform } from 'class-transformer';

export const LARGO_MINIMO_BUSQUEDA = 2;
export const LARGO_MAXIMO_BUSQUEDA = 60;
export const PALABRAS_MAXIMAS_BUSQUEDA = 5;

export const NormalizarBusqueda = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );

const EQUIVALENTES: Record<string, string> = {
  a: 'aáàäâã',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöôõ',
  u: 'uúùüû',
  c: 'cç',
};

const escapar = (caracter: string) =>
  caracter.replace(/[.*+?^${}()|[\]\\\-/]/g, '\\$&');

const sinTilde = (caracter: string) =>
  caracter
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const patronDeLetra = (caracter: string) => {
  const equivalentes = EQUIVALENTES[sinTilde(caracter)];
  return equivalentes ? `[${equivalentes}]` : escapar(caracter);
};

export const patronDePalabra = (palabra: string) =>
  Array.from(palabra, patronDeLetra).join('');

export const filtroDeBusqueda = (texto: string) => ({
  $and: texto.split(' ').map((palabra) => {
    const coincide = new RegExp(patronDePalabra(palabra), 'i');
    return { $or: [{ titulo: coincide }, { mensaje: coincide }] };
  }),
});
