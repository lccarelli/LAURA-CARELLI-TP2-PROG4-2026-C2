import { BadRequestException } from '@nestjs/common';

export const DESFASE_BUENOS_AIRES = '-03:00';
export const DIAS_MAXIMOS_DEL_RANGO = 366;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function diasDelRango(desde: string, hasta: string) {
  const primero = Date.parse(`${desde}T00:00:00Z`);
  const cantidad =
    Math.round((Date.parse(`${hasta}T00:00:00Z`) - primero) / MS_POR_DIA) + 1;
  return Array.from({ length: cantidad }, (_, indice) =>
    new Date(primero + indice * MS_POR_DIA).toISOString().slice(0, 10),
  );
}

export function limitesDelRango(desde: string, hasta: string) {
  const inicio = new Date(`${desde}T00:00:00${DESFASE_BUENOS_AIRES}`);
  const ultimoDia = new Date(`${hasta}T00:00:00${DESFASE_BUENOS_AIRES}`);
  if (inicio > ultimoDia) {
    throw new BadRequestException({
      message: 'La fecha desde no puede ser posterior a hasta',
      codigo: 'RANGO_INVALIDO',
    });
  }
  const dias =
    Math.round((ultimoDia.getTime() - inicio.getTime()) / MS_POR_DIA) + 1;
  if (dias > DIAS_MAXIMOS_DEL_RANGO) {
    throw new BadRequestException({
      message: `El rango no puede superar ${DIAS_MAXIMOS_DEL_RANGO} días`,
      codigo: 'RANGO_DEMASIADO_LARGO',
    });
  }
  return { inicio, fin: new Date(ultimoDia.getTime() + MS_POR_DIA) };
}
