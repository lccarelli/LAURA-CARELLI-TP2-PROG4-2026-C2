export function tokenQueVenceEn(segundos: number, ahora = Date.now()) {
  const exp = Math.floor(ahora / 1000) + segundos;
  const body = btoa(JSON.stringify({ sub: '1', exp }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `cabecera.${body}.firma`;
}

export function tokenConDuracion(duracion: number, ahora = Date.now()) {
  const iat = Math.floor(ahora / 1000);
  const body = btoa(JSON.stringify({ sub: '1', iat, exp: iat + duracion }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `cabecera.${body}.firma`;
}
