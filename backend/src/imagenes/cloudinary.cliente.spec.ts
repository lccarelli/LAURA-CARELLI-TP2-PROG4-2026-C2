import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryCliente } from './cloudinary.cliente.js';
import { Destino } from './destinos.js';
import { imagenesConfig } from './imagenes.config.js';

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: { upload: vi.fn(), destroy: vi.fn() },
  },
}));

const subir = vi.mocked(cloudinary.uploader.upload);

const opcionesDe = (llamada: number) =>
  subir.mock.calls[llamada][1] as unknown as {
    folder: string;
    public_id: string;
  };

const config = {
  apiKey: 'clave',
  apiSecret: 'secreto',
  cloudName: 'nube',
  carpeta: 'carpeta-de-prueba',
} as ReturnType<typeof imagenesConfig>;

const archivo = (mimetype: string, contenido: string) =>
  ({
    buffer: Buffer.from(contenido),
    mimetype,
    size: contenido.length,
  }) as Express.Multer.File;

describe('CloudinaryCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configuración', () => {
    it('[O] configura Cloudinary una sola vez con las tres credenciales', () => {
      new CloudinaryCliente(config);

      expect(cloudinary.config).toHaveBeenCalledTimes(1);
      expect(cloudinary.config).toHaveBeenCalledWith({
        api_key: 'clave',
        api_secret: 'secreto',
        cloud_name: 'nube',
      });
    });
  });

  describe('subir', () => {
    it('[O] sube la imagen como data URI y devuelve la URL segura y el id', async () => {
      subir.mockResolvedValue({
        public_id: 'banquete/abc',
        secure_url: 'https://res.cloudinary.com/nube/image/upload/abc.png',
      } as never);
      const cliente = new CloudinaryCliente(config);

      const subida = await cliente.subir(
        archivo('image/png', 'contenido'),
        Destino.PERFILES,
        'nombre',
      );

      expect(subida).toEqual({
        url: 'https://res.cloudinary.com/nube/image/upload/abc.png',
        publicId: 'banquete/abc',
      });
      const uri = subir.mock.calls[0][0];
      expect(uri).toBe(
        `data:image/png;base64,${Buffer.from('contenido').toString('base64')}`,
      );
      expect(opcionesDe(0).folder).toBe('carpeta-de-prueba/perfiles');
    });

    it('[B] la carpeta cambia según el destino', async () => {
      subir.mockResolvedValue({ public_id: 'x', secure_url: 'u' } as never);
      const cliente = new CloudinaryCliente(config);

      await cliente.subir(
        archivo('image/png', 'a'),
        Destino.PUBLICACIONES,
        'nombre',
      );
      await cliente.subir(archivo('image/png', 'b'), Destino.GALERIA, 'nombre');

      expect(opcionesDe(0).folder).toBe('carpeta-de-prueba/publicaciones');
      expect(opcionesDe(1).folder).toBe('carpeta-de-prueba/galeria');
    });

    it('[B] el tipo de la imagen viaja en la data URI', async () => {
      subir.mockResolvedValue({ public_id: 'x', secure_url: 'u' } as never);
      const cliente = new CloudinaryCliente(config);

      await cliente.subir(
        archivo('image/webp', 'x'),
        Destino.PERFILES,
        'nombre',
      );

      expect(subir.mock.calls[0][0]).toMatch(/^data:image\/webp;base64,/);
    });

    it('[O] usa el nombre recibido como id del archivo', async () => {
      subir.mockResolvedValue({ public_id: 'x', secure_url: 'u' } as never);
      const cliente = new CloudinaryCliente(config);

      await cliente.subir(
        archivo('image/png', 'a'),
        Destino.PUBLICACIONES,
        'u1-tip-1730000000000',
      );

      expect(opcionesDe(0).public_id).toBe('u1-tip-1730000000000');
    });

    it('[E] si Cloudinary falla, el error llega a quien llamó', async () => {
      subir.mockRejectedValue(new Error('cloud name is disabled'));
      const cliente = new CloudinaryCliente(config);

      await expect(
        cliente.subir(archivo('image/png', 'a'), Destino.PERFILES, 'nombre'),
      ).rejects.toThrow('cloud name is disabled');
    });
  });

  describe('borrar', () => {
    it('[O] pide a Cloudinary destruir el archivo por su id', async () => {
      vi.mocked(cloudinary.uploader.destroy).mockResolvedValue({
        result: 'ok',
      } as never);
      const cliente = new CloudinaryCliente(config);

      await cliente.borrar('banquete/abc');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('banquete/abc');
    });
  });
});
