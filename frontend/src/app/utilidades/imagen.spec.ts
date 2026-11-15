import {
  AbrirImagen,
  ImagenAbierta,
  prepararImagen,
  TAMANO_MAXIMO_IMAGEN,
  urlImagen,
  validarImagen,
} from './imagen';

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

describe('prepararImagen', () => {
  const MB = 1024 * 1024;

  const abrirCon = (tamanos: number[]) => {
    const exportar = vi.fn<ImagenAbierta['exportar']>(() => {
      const tamano = tamanos.shift();
      return Promise.resolve(tamano === undefined ? null : new Blob([new Uint8Array(tamano)]));
    });
    const cerrar = vi.fn();
    const imagen: ImagenAbierta = { exportar, cerrar };
    const abrir = vi.fn<AbrirImagen>(() => Promise.resolve(imagen));
    return { abrir, exportar, cerrar };
  };

  it('[Z] una foto que ya entra no se toca', async () => {
    const chica = archivo('image/jpeg', 100);
    const { abrir } = abrirCon([]);

    expect(await prepararImagen(chica, abrir)).toBe(chica);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('[B] una foto de exactamente 2 MB no se toca y una de 2 MB más 1 byte sí', async () => {
    const { abrir } = abrirCon([1 * MB]);

    await prepararImagen(archivo('image/jpeg', TAMANO_MAXIMO_IMAGEN), abrir);
    expect(abrir).not.toHaveBeenCalled();

    await prepararImagen(archivo('image/jpeg', TAMANO_MAXIMO_IMAGEN + 1), abrir);
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('[O] una foto grande se reduce a JPG con la menor pérdida que alcance', async () => {
    const { abrir, exportar, cerrar } = abrirCon([5 * MB, 3 * MB, 1 * MB]);
    const grande = new File([new Uint8Array(6 * MB)], 'IMG_1234.PNG', { type: 'image/png' });

    const reducida = await prepararImagen(grande, abrir);

    expect(reducida.name).toBe('IMG_1234.jpg');
    expect(reducida.type).toBe('image/jpeg');
    expect(reducida.size).toBe(1 * MB);
    expect(exportar.mock.calls).toEqual([
      [2000, 0.85],
      [2000, 0.7],
      [1600, 0.7],
    ]);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('[B] si ya la primera pasada entra, no sigue probando', async () => {
    const { abrir, exportar } = abrirCon([TAMANO_MAXIMO_IMAGEN]);

    const reducida = await prepararImagen(archivo('image/jpeg', 6 * MB), abrir);

    expect(reducida.size).toBe(TAMANO_MAXIMO_IMAGEN);
    expect(exportar).toHaveBeenCalledTimes(1);
  });

  it('[E] si ni con la mayor reducción entra, devuelve la original para que se rechace', async () => {
    const { abrir, exportar, cerrar } = abrirCon([9 * MB, 9 * MB, 9 * MB, 9 * MB, 9 * MB]);
    const grande = archivo('image/jpeg', 12 * MB);

    expect(await prepararImagen(grande, abrir)).toBe(grande);
    expect(exportar).toHaveBeenCalledTimes(5);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('[E] si el navegador no puede abrir la foto, devuelve la original', async () => {
    const grande = archivo('image/jpeg', 6 * MB);
    const abrir = vi.fn<AbrirImagen>(() => Promise.resolve(null));

    expect(await prepararImagen(grande, abrir)).toBe(grande);
  });

  it('[E] si la exportación falla en todos los intentos, devuelve la original y cierra', async () => {
    const { abrir, cerrar } = abrirCon([]);
    const grande = archivo('image/jpeg', 6 * MB);

    expect(await prepararImagen(grande, abrir)).toBe(grande);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('[S] un GIF grande no se convierte, porque perdería la animación', async () => {
    const gif = archivo('image/gif', 6 * MB);
    const { abrir } = abrirCon([1 * MB]);

    expect(await prepararImagen(gif, abrir)).toBe(gif);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('[S] algo que no es una imagen no se toca', async () => {
    const pdf = archivo('application/pdf', 6 * MB);
    const { abrir } = abrirCon([1 * MB]);

    expect(await prepararImagen(pdf, abrir)).toBe(pdf);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('[M] una imagen de otro formato, como HEIC, se convierte aunque pese poco', async () => {
    const { abrir } = abrirCon([300 * 1024]);

    const convertida = await prepararImagen(archivo('image/heic', 500 * 1024), abrir);

    expect(convertida.type).toBe('image/jpeg');
    expect(validarImagen(convertida)).toBeNull();
  });
});
