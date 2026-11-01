import { imagenesConfig } from './imagenes.config.js';

describe('imagenesConfig', () => {
  beforeEach(() => {
    vi.stubEnv('CLOUDINARY_API_KEY', 'clave');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'secreto');
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'nube');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[O] lee las credenciales del entorno y usa banquete como carpeta por defecto', () => {
    vi.stubEnv('CLOUDINARY_CARPETA', '');
    expect(imagenesConfig()).toEqual({
      apiKey: 'clave',
      apiSecret: 'secreto',
      cloudName: 'nube',
      carpeta: 'banquete',
    });
  });

  it('[O] con CLOUDINARY_CARPETA usa esa carpeta raíz', () => {
    vi.stubEnv('CLOUDINARY_CARPETA', 'banquete-dev');

    expect(imagenesConfig().carpeta).toBe('banquete-dev');
  });

  it.each([
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_CLOUD_NAME',
  ])('[E] sin %s no arranca', (variable) => {
    vi.stubEnv(variable, '');

    expect(() => imagenesConfig()).toThrow(variable);
  });
});
