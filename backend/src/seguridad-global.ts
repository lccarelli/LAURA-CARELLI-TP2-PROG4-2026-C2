import { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { RUTA_DE_DOCUMENTACION } from './swagger.js';

const paraLaApi = helmet();
const paraLaDocumentacion = helmet({ contentSecurityPolicy: false });

export function aplicarSeguridadGlobal(app: INestApplication) {
  app.use(
    (solicitud: Request, respuesta: Response, siguiente: NextFunction) => {
      const esDocumentacion = solicitud.path.startsWith(
        `/${RUTA_DE_DOCUMENTACION}`,
      );
      (esDocumentacion ? paraLaDocumentacion : paraLaApi)(
        solicitud,
        respuesta,
        siguiente,
      );
    },
  );
}
