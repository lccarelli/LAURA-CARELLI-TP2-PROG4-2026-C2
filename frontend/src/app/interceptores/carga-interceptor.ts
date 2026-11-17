import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { Carga, MENSAJE_DE_CARGA, SIN_INDICADOR_DE_CARGA } from '../servicios/carga/carga';
import { mensajeParaSolicitud } from '../servicios/carga/mensajes-de-carga';

const EN_SEGUNDO_PLANO = [
  /\/notificaciones(\/|$)/,
  /\/push\//,
  /\/health$/,
  /\/auth\/(autorizar|refrescar)$/,
  /\/guardadas\/letras$/,
];

export const cargaInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  const ruta = solicitud.url.split('?')[0];
  const sinIndicador =
    solicitud.context.get(SIN_INDICADOR_DE_CARGA) ||
    EN_SEGUNDO_PLANO.some((patron) => patron.test(ruta));
  if (sinIndicador) {
    return siguiente(solicitud);
  }
  const carga = inject(Carga);
  const mensaje =
    solicitud.context.get(MENSAJE_DE_CARGA) ??
    mensajeParaSolicitud(solicitud.method, solicitud.url, solicitud.params);
  const id = carga.iniciar(mensaje);
  return siguiente(solicitud).pipe(finalize(() => carga.terminar(id)));
};
