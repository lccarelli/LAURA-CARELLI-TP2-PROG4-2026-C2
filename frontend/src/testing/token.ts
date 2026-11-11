export function tokenQueVenceEn(segundos: number, ahora = Date.now()) {
  const exp = Math.floor(ahora / 1000) + segundos;
  const body = btoa(JSON.stringify({ sub: '1', exp }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `cabecera.${body}.firma`;
}
