import { Injectable } from '@nestjs/common';
import { Campos, Nivel, emitirLog } from './logger-global.js';

export const EVENTOS_DE_LOG = {
  COMENTARIO_CREADO: 'comentario_creado',
  COMENTARIO_MODIFICADO: 'comentario_modificado',
  EVENTO_ME_GUSTA_NO_REGISTRADO: 'evento_me_gusta_no_registrado',
  IMAGEN_BORRADA: 'imagen_borrada',
  IMAGEN_SUBIDA: 'imagen_subida',
  INGRESO_CORRECTO: 'ingreso_correcto',
  INGRESO_FALLIDO: 'ingreso_fallido',
  ME_GUSTA_DADO: 'me_gusta_dado',
  ME_GUSTA_QUITADO: 'me_gusta_quitado',
  LIMITE_SUPERADO: 'limite_superado',
  PUBLICACION_CREADA: 'publicacion_creada',
  PUBLICACION_ELIMINADA: 'publicacion_eliminada',
  SERVIDOR_INICIADO: 'servidor_iniciado',
  SOLICITUD_EXITOSA: 'solicitud_exitosa',
  SOLICITUD_FALLIDA: 'solicitud_fallida',
  SOLICITUD_RECHAZADA: 'solicitud_rechazada',
  TOKEN_AUSENTE: 'token_ausente',
  TOKEN_RECHAZADO: 'token_rechazado',
  TOKEN_REFRESCADO: 'token_refrescado',
  SESION_VENCIDA: 'sesion_vencida',
  USUARIO_NO_AUTORIZADO: 'usuario_no_autorizado',
  USUARIO_REGISTRADO: 'usuario_registrado',
} as const;

export class ContextLogger {
  constructor(private readonly modulo: string) {}

  info(evento: string, mensaje: string, campos?: Campos) {
    this.registrar('info', evento, mensaje, campos);
  }

  advertir(evento: string, mensaje: string, campos?: Campos) {
    this.registrar('warn', evento, mensaje, campos);
  }

  error(evento: string, mensaje: string, campos?: Campos) {
    this.registrar('error', evento, mensaje, campos);
  }

  registrar(nivel: Nivel, evento: string, mensaje: string, campos?: Campos) {
    emitirLog({ nivel, modulo: this.modulo, evento, mensaje, campos });
  }
}

@Injectable()
export class LoggerFactory {
  crear(modulo: string): ContextLogger {
    return new ContextLogger(modulo);
  }
}
