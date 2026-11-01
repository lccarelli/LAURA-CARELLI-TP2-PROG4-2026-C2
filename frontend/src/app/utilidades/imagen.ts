export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validarImagen(archivo: File | null): string | null {
  if (!archivo) {
    return null;
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'imagen.tipo';
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return 'imagen.pesada';
  }
  return null;
}

export function urlImagen(ruta?: string): string {
  return ruta || '/sin-foto.svg';
}
