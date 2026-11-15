export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const INTENTOS = [
  { lado: 2000, calidad: 0.85 },
  { lado: 2000, calidad: 0.7 },
  { lado: 1600, calidad: 0.7 },
  { lado: 1280, calidad: 0.6 },
  { lado: 1024, calidad: 0.55 },
] as const;

export interface ImagenAbierta {
  exportar(lado: number, calidad: number): Promise<Blob | null>;
  cerrar(): void;
}

export type AbrirImagen = (archivo: File) => Promise<ImagenAbierta | null>;

async function abrirEnElNavegador(archivo: File): Promise<ImagenAbierta | null> {
  if (typeof createImageBitmap !== 'function') {
    return null;
  }
  try {
    const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    return {
      exportar: (lado, calidad) => {
        const escala = Math.min(1, lado / Math.max(mapa.width, mapa.height));
        const ancho = Math.round(mapa.width * escala);
        const alto = Math.round(mapa.height * escala);
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        const contexto = lienzo.getContext('2d');
        if (!contexto) {
          return Promise.resolve(null);
        }
        contexto.fillStyle = 'white';
        contexto.fillRect(0, 0, ancho, alto);
        contexto.drawImage(mapa, 0, 0, ancho, alto);
        return new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));
      },
      cerrar: () => mapa.close(),
    };
  } catch {
    return null;
  }
}

function hayQueReducir(archivo: File) {
  if (archivo.type === 'image/gif' || !archivo.type.startsWith('image/')) {
    return false;
  }
  return !TIPOS_PERMITIDOS.includes(archivo.type) || archivo.size > TAMANO_MAXIMO_IMAGEN;
}

export async function prepararImagen(
  archivo: File,
  abrir: AbrirImagen = abrirEnElNavegador,
): Promise<File> {
  if (!hayQueReducir(archivo)) {
    return archivo;
  }
  const imagen = await abrir(archivo);
  if (!imagen) {
    return archivo;
  }
  try {
    for (const { lado, calidad } of INTENTOS) {
      const reducida = await imagen.exportar(lado, calidad);
      if (reducida && reducida.size <= TAMANO_MAXIMO_IMAGEN) {
        return new File([reducida], `${archivo.name.replace(/\.[^.]+$/, '')}.jpg`, {
          type: 'image/jpeg',
          lastModified: archivo.lastModified,
        });
      }
    }
    return archivo;
  } finally {
    imagen.cerrar();
  }
}

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
