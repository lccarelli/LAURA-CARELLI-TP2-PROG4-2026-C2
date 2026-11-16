export const TIPOS_NOTIFICACION = ['comentario', 'me_gusta'] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

export interface Notificacion {
  _id: string;
  tipo: TipoNotificacion;
  leida: boolean;
  fecha: string;
  publicacion: { _id: string; titulo: string };
  actor: { _id: string; nombreUsuario: string };
}

export interface PaginaNotificaciones {
  datos: Notificacion[];
  offset: number;
  limit: number;
  hayMas: boolean;
}
