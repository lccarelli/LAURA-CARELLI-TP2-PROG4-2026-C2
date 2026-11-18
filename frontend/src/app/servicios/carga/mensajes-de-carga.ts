import { HttpParams } from '@angular/common/http';

export interface MensajeDeCarga {
  clave: string;
  nota?: string;
  segundosHastaNota?: number;
}

export const MENSAJE_POR_DEFECTO: MensajeDeCarga = { clave: 'carga.cargando' };

const SERVIDOR_DESPIERTO: Pick<MensajeDeCarga, 'nota' | 'segundosHastaNota'> = {
  nota: 'carga.despertando',
  segundosHastaNota: 4,
};

const TARDA: Pick<MensajeDeCarga, 'nota' | 'segundosHastaNota'> = {
  nota: 'carga.tarda',
  segundosHastaNota: 6,
};

const REGLAS: [metodo: string, ruta: RegExp, mensaje: MensajeDeCarga][] = [
  [
    'POST',
    /\/auth\/(ingresar|google|acceso-docente)$/,
    { clave: 'carga.ingresando', ...SERVIDOR_DESPIERTO },
  ],
  ['POST', /\/auth\/registro$/, { clave: 'carga.creando_cuenta', ...SERVIDOR_DESPIERTO }],
  ['POST', /\/publicaciones$/, { clave: 'carga.publicando', ...TARDA }],
  ['PUT', /\/publicaciones\/[^/]+$/, { clave: 'carga.guardando_cambios', ...TARDA }],
  ['DELETE', /\/publicaciones\/[^/]+$/, { clave: 'carga.eliminando' }],
  ['POST', /\/publicaciones\/[^/]+\/comentarios$/, { clave: 'carga.comentando' }],
  ['PUT', /\/comentarios\/[^/]+$/, { clave: 'carga.guardando_comentario' }],
  ['POST', /\/publicaciones\/[^/]+\/compartir$/, { clave: 'carga.compartiendo' }],
  ['PUT', /\/usuarios\/yo$/, { clave: 'carga.guardando_perfil', ...TARDA }],
  ['POST', /\/usuarios$/, { clave: 'carga.creando_usuario', ...TARDA }],
  ['DELETE', /\/usuarios\/[^/]+$/, { clave: 'carga.deshabilitando' }],
  ['POST', /\/usuarios\/[^/]+\/habilitar$/, { clave: 'carga.habilitando' }],
  ['POST', /\/imagenes$/, { clave: 'carga.subiendo_imagen', ...TARDA }],
  ['GET', /\/estadisticas\//, { clave: 'carga.calculando' }],
];

const esPaginaSiguiente = (params: HttpParams) => Number(params.get('offset') ?? 0) > 0;

export function mensajeParaSolicitud(
  metodo: string,
  url: string,
  params: HttpParams,
): MensajeDeCarga {
  const ruta = url.split('?')[0];
  const regla = REGLAS.find(([m, patron]) => m === metodo && patron.test(ruta));
  if (regla) {
    return regla[2];
  }
  if (metodo === 'GET' && esPaginaSiguiente(params)) {
    return { clave: 'carga.trayendo_mas', ...TARDA };
  }
  if (metodo === 'GET' && params.get('q')) {
    return { clave: 'carga.buscando' };
  }
  return MENSAJE_POR_DEFECTO;
}
