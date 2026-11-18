const LARGO_MAXIMO = 20;
const LARGO_MINIMO = 3;
const RELLENO = 'usuario';

export function baseDeNombreDeUsuario(correo: string) {
  const local = correo.split('@')[0] ?? '';
  const limpio = local
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\W/g, '_')
    .slice(0, LARGO_MAXIMO);
  return limpio.length >= LARGO_MINIMO ? limpio : RELLENO;
}

export function conSufijo(base: string, numero: number) {
  if (numero === 0) {
    return base;
  }
  const sufijo = String(numero);
  return `${base.slice(0, LARGO_MAXIMO - sufijo.length)}${sufijo}`;
}
