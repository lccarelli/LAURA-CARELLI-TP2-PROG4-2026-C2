import type { ConfigType } from '@nestjs/config';
import { authConfig } from './auth.config.js';
import { ClienteGoogle } from './cliente-google.js';

const FOTO = 'https://lh3.googleusercontent.com/a/foto=s96-c';

const sinCifrar = (direccion: string) => {
  const url = new URL(direccion);
  url.protocol = 'http:';
  return url.href;
};

const crear = (googleClientId?: string) =>
  new ClienteGoogle({ googleClientId } as ConfigType<typeof authConfig>);

const respuesta = (tipo: string, bytes: number, ok = true) =>
  new Response(new Uint8Array(bytes), {
    status: ok ? 200 : 404,
    headers: { 'content-type': tipo },
  });

describe('ClienteGoogle', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('habilitado', () => {
    it('[O] con el ID de cliente configurado está habilitado', () => {
      expect(crear('id.apps.googleusercontent.com').habilitado).toBe(true);
    });

    it.each([undefined, ''])(
      '[Z] sin ID de cliente (%j) no está habilitado',
      (id) => {
        expect(crear(id).habilitado).toBe(false);
      },
    );
  });

  describe('verificar', () => {
    const conPayload = (payload: unknown, id = 'cliente-1') => {
      const cliente = crear(id);
      const verificar = vi.fn(async () => ({ getPayload: () => payload }));
      (
        cliente as unknown as { cliente: { verifyIdToken: unknown } }
      ).cliente.verifyIdToken = verificar;
      return { cliente, verificar };
    };

    it('[O] devuelve el perfil con el correo en minúsculas y el nombre separado', async () => {
      const { cliente } = conPayload({
        sub: '123',
        email: 'Laura@Gmail.com',
        email_verified: true,
        given_name: 'Laura',
        family_name: 'Carelli',
        picture: FOTO,
      });

      expect(await cliente.verificar('credencial')).toEqual({
        id: '123',
        correo: 'laura@gmail.com',
        correoVerificado: true,
        nombre: 'Laura',
        apellido: 'Carelli',
        foto: FOTO,
      });
    });

    it('[I] exige que el token sea para esta aplicación (audience = ID de cliente)', async () => {
      const { cliente, verificar } = conPayload(
        { sub: '1', email: 'a@b.com' },
        'mi-cliente',
      );

      await cliente.verificar('credencial');

      expect(verificar).toHaveBeenCalledWith({
        idToken: 'credencial',
        audience: 'mi-cliente',
      });
    });

    it('[S] si falta el verificado, lo toma como no verificado', async () => {
      const { cliente } = conPayload({ sub: '1', email: 'a@b.com' });

      expect((await cliente.verificar('c'))?.correoVerificado).toBe(false);
    });

    it('[B] sin nombre separado usa el nombre completo', async () => {
      const { cliente } = conPayload({
        sub: '1',
        email: 'a@b.com',
        name: 'Laura Carelli',
      });

      expect((await cliente.verificar('c'))?.nombre).toBe('Laura Carelli');
    });

    it.each([[null], [{}], [{ sub: '1' }], [{ email: 'a@b.com' }]])(
      '[E] un contenido incompleto (%j) no es válido',
      async (payload) => {
        const { cliente } = conPayload(payload);

        expect(await cliente.verificar('c')).toBeNull();
      },
    );

    it('[E] si Google rechaza el token (vencido, de otra app, falso) no lanza: devuelve null', async () => {
      const cliente = crear('c');
      (
        cliente as unknown as { cliente: { verifyIdToken: unknown } }
      ).cliente.verifyIdToken = vi.fn(async () => {
        throw new Error('Wrong recipient');
      });

      expect(await cliente.verificar('falso')).toBeNull();
    });
  });

  describe('descargarFoto', () => {
    it('[O] baja la foto y la entrega como un archivo de imagen', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => respuesta('image/jpeg', 1000)),
      );

      const archivo = await crear('c').descargarFoto(FOTO);

      expect(archivo).toMatchObject({
        mimetype: 'image/jpeg',
        size: 1000,
        fieldname: 'imagen',
      });
      expect(archivo!.buffer).toHaveLength(1000);
    });

    it('[S] sólo baja fotos de Google: cualquier otra dirección se descarta sin pedirla', async () => {
      const pedir = vi.fn(async () => respuesta('image/jpeg', 10));
      vi.stubGlobal('fetch', pedir);

      for (const url of [
        'https://sitio-ajeno.test/foto.jpg',
        sinCifrar(FOTO),
        'https://lh3.googleusercontent.com.otro.test/foto',
        'https://evil.test/https://lh3.googleusercontent.com/x',
        'no es una dirección',
        '',
      ]) {
        expect(await crear('c').descargarFoto(url)).toBeNull();
      }
      expect(pedir).not.toHaveBeenCalled();
    });

    it('[Z] sin foto devuelve null', async () => {
      expect(await crear('c').descargarFoto(undefined)).toBeNull();
    });

    it.each([
      ['lo que baja no es una imagen', () => respuesta('text/html', 100)],
      ['Google responde con error', () => respuesta('image/jpeg', 100, false)],
      ['pesa más de 2 MB', () => respuesta('image/jpeg', 2 * 1024 * 1024 + 1)],
      ['viene vacía', () => respuesta('image/jpeg', 0)],
    ])('[E] si %s, la descarta', async (_caso, hacer) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => hacer()),
      );

      expect(await crear('c').descargarFoto(FOTO)).toBeNull();
    });

    it('[E] si la red falla o tarda demasiado no lanza: devuelve null', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('timeout');
        }),
      );

      expect(await crear('c').descargarFoto(FOTO)).toBeNull();
    });
  });
});
