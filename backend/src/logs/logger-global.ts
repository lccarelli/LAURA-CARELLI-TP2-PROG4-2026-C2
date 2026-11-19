import { LoggerService } from '@nestjs/common';
import { obtenerIdSolicitud } from './id-solicitud.middleware.js';

export const NOMBRE_DEL_SERVICIO = 'banquete';

export type Nivel = 'info' | 'warn' | 'error';
export type Campos = Record<string, unknown>;
export type NuevoLog = {
  nivel: Nivel;
  modulo: string;
  evento: string;
  mensaje: string;
  campos?: Campos;
};

export function crearLog(entrada: NuevoLog): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    nivel: entrada.nivel,
    servicio: NOMBRE_DEL_SERVICIO,
    modulo: entrada.modulo,
    id_solicitud: obtenerIdSolicitud(),
    evento: entrada.evento,
    mensaje: entrada.mensaje,
    ...entrada.campos,
  });
}

export function emitirLog(entrada: NuevoLog) {
  process.stdout.write(`${crearLog(entrada)}\n`);
}

function textoDe(mensaje: unknown) {
  if (mensaje instanceof Error) {
    return mensaje.message;
  }
  return typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje);
}

export class LoggerGlobal implements LoggerService {
  log(mensaje: unknown, ...parametros: unknown[]) {
    this.emitir('info', mensaje, parametros);
  }

  warn(mensaje: unknown, ...parametros: unknown[]) {
    this.emitir('warn', mensaje, parametros);
  }

  error(mensaje: unknown, ...parametros: unknown[]) {
    this.emitir('error', mensaje, parametros);
  }

  fatal(mensaje: unknown, ...parametros: unknown[]) {
    this.emitir('error', mensaje, parametros);
  }

  private emitir(nivel: Nivel, mensaje: unknown, parametros: unknown[]) {
    const ultimo = parametros.at(-1);
    const modulo = typeof ultimo === 'string' ? ultimo : 'Nest';
    const pilaExplicita = parametros.length > 1 ? parametros[0] : undefined;
    const pila = mensaje instanceof Error ? mensaje.stack : pilaExplicita;
    emitirLog({
      nivel,
      modulo,
      evento: 'sistema',
      mensaje: textoDe(mensaje),
      campos: typeof pila === 'string' ? { pila } : undefined,
    });
  }
}
