import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeApi(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Intentá de nuevo en unos segundos.';
  }
  if (error.status === 413) {
    return 'La imagen no puede pesar más de 2 MB';
  }

  const mensaje = error.error?.message;
  if (Array.isArray(mensaje)) {
    return mensaje.join('\n');
  }
  if (typeof mensaje === 'string') {
    return mensaje;
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}
