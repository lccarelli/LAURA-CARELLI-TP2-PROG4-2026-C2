import { Injectable } from '@nestjs/common';
import { Campos, Nivel, emitirLog } from './logger-global.js';

export const EVENTOS_DE_LOG = {
  ACCESO_DENEGADO: 'acceso_denegado',
  COMENTARIO_CREADO: 'comentario_creado',
  ERROR_NO_CONTROLADO: 'error_no_controlado',
  COMENTARIO_MODIFICADO: 'comentario_modificado',
  EVENTO_ME_GUSTA_NO_REGISTRADO: 'evento_me_gusta_no_registrado',
  IMAGEN_BORRADA: 'imagen_borrada',
  IMAGEN_NO_BORRADA: 'imagen_no_borrada',
  IMAGEN_SUBIDA: 'imagen_subida',
  ACCESO_DOCENTE: 'acceso_docente',
  INGRESO_CORRECTO: 'ingreso_correcto',
  INGRESO_GOOGLE: 'ingreso_google',
  CUENTA_GOOGLE_CREADA: 'cuenta_google_creada',
  CUENTA_GOOGLE_VINCULADA: 'cuenta_google_vinculada',
  FOTO_GOOGLE_NO_COPIADA: 'foto_google_no_copiada',
  INGRESO_NO_REGISTRADO: 'ingreso_no_registrado',
  VISITA_NO_REGISTRADA: 'visita_no_registrada',
  VISITA_REGISTRADA: 'visita_registrada',
  INGRESO_FALLIDO: 'ingreso_fallido',
  INGRESO_RECHAZADO: 'ingreso_rechazado',
  ME_GUSTA_DADO: 'me_gusta_dado',
  ME_GUSTA_QUITADO: 'me_gusta_quitado',
  LIMITE_SUPERADO: 'limite_superado',
  PUBLICACION_CREADA: 'publicacion_creada',
  PUBLICACION_EDITADA: 'publicacion_editada',
  PUBLICACION_ELIMINADA: 'publicacion_eliminada',
  SERVIDOR_INICIADO: 'servidor_iniciado',
  SOLICITUD_EXITOSA: 'solicitud_exitosa',
  SOLICITUD_FALLIDA: 'solicitud_fallida',
  SOLICITUD_RECHAZADA: 'solicitud_rechazada',
  TOKEN_AUSENTE: 'token_ausente',
  TOKEN_RECHAZADO: 'token_rechazado',
  TOKEN_REFRESCADO: 'token_refrescado',
  SESION_VENCIDA: 'sesion_vencida',
  USUARIO_CREADO: 'usuario_creado',
  USUARIO_DESHABILITADO: 'usuario_deshabilitado',
  USUARIO_EDITADO: 'usuario_editado',
  USUARIO_HABILITADO: 'usuario_habilitado',
  USUARIO_NO_AUTORIZADO: 'usuario_no_autorizado',
  USUARIO_REGISTRADO: 'usuario_registrado',
  NOTIFICACION_NO_REGISTRADA: 'notificacion_no_registrada',
  PUSH_NO_ENVIADO: 'push_no_enviado',
  WEBHOOK_NO_ENVIADO: 'webhook_no_enviado',
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
