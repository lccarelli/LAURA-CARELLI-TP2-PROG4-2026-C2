import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type ContextoDeSolicitud = { idSolicitud: string };

const almacen = new AsyncLocalStorage<ContextoDeSolicitud>();

export function ejecutarConContexto<T>(
  contexto: ContextoDeSolicitud,
  funcion: () => T,
): T {
  return almacen.run(contexto, funcion);
}

export function obtenerIdSolicitud(): string | undefined {
  return almacen.getStore()?.idSolicitud;
}

export const ENCABEZADO_DE_ID_SOLICITUD = 'x-request-id';
const FORMATO_DE_ID_SOLICITUD_VALIDO = /^[\w-]{8,64}$/;

export function asignarIdSolicitud(
  solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction,
) {
  const recibido = solicitud.header(ENCABEZADO_DE_ID_SOLICITUD);
  const idSolicitud =
    recibido && FORMATO_DE_ID_SOLICITUD_VALIDO.test(recibido)
      ? recibido
      : randomUUID();
  respuesta.setHeader(ENCABEZADO_DE_ID_SOLICITUD, idSolicitud);
  ejecutarConContexto({ idSolicitud }, siguiente);
}
