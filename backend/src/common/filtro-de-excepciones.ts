import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';

const ERROR_INESPERADO = {
  message: 'Ocurrió un error inesperado',
  codigo: 'ERROR_INESPERADO',
};

const SOLICITUD_INVALIDA = {
  message: 'La solicitud no es válida',
  codigo: 'SOLICITUD_INVALIDA',
};

const RESPUESTAS_POR_ESTADO: Record<number, typeof ERROR_INESPERADO> = {
  [HttpStatus.NOT_FOUND]: {
    message: 'La ruta no existe',
    codigo: 'RUTA_NO_ENCONTRADA',
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    message: 'El archivo supera el tamaño máximo',
    codigo: 'ARCHIVO_DEMASIADO_GRANDE',
  },
};

const tieneCodigo = (cuerpo: unknown) =>
  typeof cuerpo === 'object' && cuerpo !== null && 'codigo' in cuerpo;

@Catch()
export class FiltroDeExcepciones implements ExceptionFilter {
  private readonly logger: ContextLogger;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.crear(FiltroDeExcepciones.name);
  }

  catch(excepcion: unknown, anfitrion: ArgumentsHost) {
    const respuesta = anfitrion.switchToHttp().getResponse<Response>();

    if (!(excepcion instanceof HttpException)) {
      this.logger.error(
        EVENTOS_DE_LOG.ERROR_NO_CONTROLADO,
        'Error no controlado',
        {
          motivo: (excepcion as Error)?.message,
          pila: (excepcion as Error)?.stack,
        },
      );
      respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).json(ERROR_INESPERADO);
      return;
    }

    const estado = excepcion.getStatus();
    const cuerpo = excepcion.getResponse();
    if (tieneCodigo(cuerpo) || estado >= HttpStatus.INTERNAL_SERVER_ERROR) {
      respuesta.status(estado).json(cuerpo);
      return;
    }
    respuesta
      .status(estado)
      .json(RESPUESTAS_POR_ESTADO[estado] ?? SOLICITUD_INVALIDA);
  }
}
