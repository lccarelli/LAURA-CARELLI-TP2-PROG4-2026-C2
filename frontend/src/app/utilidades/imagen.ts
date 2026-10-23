import { environment } from '../../environments/environment';

export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validarImagen(archivo: File | null): string | null {
  if (!archivo) {
    return null;
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'La imagen debe ser JPG, PNG, WEBP o GIF';
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return 'La imagen no puede pesar más de 2 MB';
  }
  return null;
}

export function urlImagen(ruta?: string): string {
  return ruta ? `${environment.API_URL}${ruta}` : '/sin-foto.svg';
}
