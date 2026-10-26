import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeApi(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'errores.sin_conexion';
  }
  if (error.status === 413) {
    return 'imagen.pesada';
  }

  const codigo = error.error?.codigo;
  if (typeof codigo === 'string') {
    return `api.${codigo}`;
  }
  return 'errores.inesperado';
}
