import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeApi } from './errores';

const error = (status: number, cuerpo?: unknown) =>
  new HttpErrorResponse({ status, error: cuerpo });

describe('mensajeDeApi', () => {
  it('[Z] un error sin cuerpo da la clave del mensaje general', () => {
    expect(mensajeDeApi(error(500))).toBe('errores.inesperado');
  });

  it('[O] un error con código da la clave de ese código', () => {
    expect(mensajeDeApi(error(409, { codigo: 'CORREO_REPETIDO' }))).toBe('api.CORREO_REPETIDO');
  });

  it('[M] un cuerpo con mensajes pero sin código da la clave del mensaje general', () => {
    expect(mensajeDeApi(error(400, { message: ['uno', 'dos'] }))).toBe('errores.inesperado');
  });

  it('[I] el estado 0 significa que no hubo conexión', () => {
    expect(mensajeDeApi(error(0))).toBe('errores.sin_conexion');
  });

  it('[E] el estado 413 da la clave del tamaño de la imagen', () => {
    expect(mensajeDeApi(error(413, { message: 'File too large' }))).toBe('imagen.pesada');
  });
});
