const ZONA_DE_BUENOS_AIRES = 'America/Argentina/Buenos_Aires';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export const DIAS_MAXIMOS_DEL_RANGO = 366;

const aMilisegundos = (fecha: string) => Date.parse(`${fecha}T00:00:00Z`);

export function hoyEnBuenosAires(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_DE_BUENOS_AIRES,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

export function sumarDias(fecha: string, dias: number) {
  return new Date(aMilisegundos(fecha) + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

export function diasDelRango(desde: string, hasta: string) {
  return Math.round((aMilisegundos(hasta) - aMilisegundos(desde)) / MS_POR_DIA) + 1;
}

export function etiquetaDeDia(fecha: string, idioma = 'es') {
  return new Intl.DateTimeFormat(idioma, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(aMilisegundos(fecha));
}
