import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

export function logsHttp(
  solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction,
) {
  const inicio = Date.now();
  respuesta.on('finish', () => {
    const duracion = Date.now() - inicio;
    const mensaje = `${solicitud.method} ${solicitud.originalUrl} ${respuesta.statusCode} ${duracion}ms`;
    if (respuesta.statusCode >= 500) {
      logger.error(mensaje);
    } else if (respuesta.statusCode >= 400) {
      logger.warn(mensaje);
    } else {
      logger.log(mensaje);
    }
  });
  siguiente();
}
