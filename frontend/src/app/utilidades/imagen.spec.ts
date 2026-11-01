import { TAMANO_MAXIMO_IMAGEN, urlImagen, validarImagen } from './imagen';

const archivo = (tipo: string, bytes: number) =>
  new File([new Uint8Array(bytes)], 'foto', { type: tipo });

describe('validarImagen', () => {
  it('[Z] sin archivo no hay error porque la imagen es opcional', () => {
    expect(validarImagen(null)).toBeNull();
  });

  it('[O] una imagen PNG chica es válida', () => {
    expect(validarImagen(archivo('image/png', 10))).toBeNull();
  });

  it('[M] JPG, PNG, WEBP y GIF son válidos', () => {
    for (const tipo of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(validarImagen(archivo(tipo, 10))).toBeNull();
    }
  });

  it('[B] 2 MB exactos es válida y 2 MB más 1 byte no', () => {
    expect(validarImagen(archivo('image/png', TAMANO_MAXIMO_IMAGEN))).toBeNull();
    expect(validarImagen(archivo('image/png', TAMANO_MAXIMO_IMAGEN + 1))).toBe('imagen.pesada');
  });

  it('[E] un archivo que no es imagen o es SVG se rechaza', () => {
    expect(validarImagen(archivo('application/pdf', 10))).toBe('imagen.tipo');
    expect(validarImagen(archivo('image/svg+xml', 10))).toBe('imagen.tipo');
  });
});

describe('urlImagen', () => {
  it('[Z] sin ruta devuelve la imagen por defecto', () => {
    expect(urlImagen()).toBe('/sin-foto.svg');
  });

  it('[O] con una URL de Cloudinary la devuelve tal cual', () => {
    const url = 'https://res.cloudinary.com/nube/image/upload/banquete/abc.png';
    expect(urlImagen(url)).toBe(url);
  });

  it('[B] una imagen de la carpeta pública de la aplicación no pasa por la API', () => {
    expect(urlImagen('/demo/galletitas-1.jpg')).toBe('/demo/galletitas-1.jpg');
  });
});
