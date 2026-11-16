import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { crearApp } from './ayudas/app.js';
import {
  comentarDesde,
  con,
  darMeGustaDesde,
  prepararEscenario,
} from './ayudas/notificaciones.js';

const URL_WEBHOOK = 'https://hooks.prueba.test/banquete';
const SECRETO = 'secreto-de-prueba';

describe('webhook de notificaciones', () => {
  let app: INestApplication;
  let autoria: { token: string; usuario: { _id: string } };
  let otra: { token: string; usuario: { _id: string } };
  let publicacionId: string;
  let fetchFalso: ReturnType<typeof vi.fn>;

  const llamadas = () =>
    fetchFalso.mock.calls.filter(([url]) => url === URL_WEBHOOK);
  const cuerpoDe = (indice: number) =>
    JSON.parse(llamadas()[indice][1].body as string);

  beforeAll(async () => {
    process.env.WEBHOOK_URL = URL_WEBHOOK;
    process.env.WEBHOOK_SECRETO = SECRETO;
    app = await crearApp();
  });

  beforeEach(async () => {
    ({ autoria, otra, publicacionId } = await prepararEscenario(app));
    fetchFalso = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    delete process.env.WEBHOOK_URL;
    delete process.env.WEBHOOK_SECRETO;
    await app.close();
  });

  it.each([
    ['comentario', comentarDesde],
    ['me_gusta', darMeGustaDesde],
  ])(
    '[O] avisa con el evento, la publicación, quién y cuándo (%s)',
    async (evento, accion) => {
      await accion(app, otra.token, publicacionId);

      expect(llamadas()).toHaveLength(1);
      expect(cuerpoDe(0)).toEqual({
        evento,
        publicacion: { id: publicacionId, titulo: 'Título 1' },
        actor: { id: otra.usuario._id, nombreUsuario: 'juan_p' },
        destinatario: { id: autoria.usuario._id },
        fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    },
  );

  it('[I] manda JSON por POST con la firma HMAC del cuerpo', async () => {
    await comentarDesde(app, otra.token, publicacionId);

    const [, init] = llamadas()[0];
    const firma = createHmac('sha256', SECRETO)
      .update(init.body as string)
      .digest('hex');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Banquete-Firma': `sha256=${firma}`,
    });
  });

  it('[E] no avisa cuando la persona actúa sobre su propia publicación', async () => {
    await comentarDesde(app, autoria.token, publicacionId);

    expect(llamadas()).toHaveLength(0);
  });

  it('[B] un me gusta repetido sin leer no vuelve a avisar', async () => {
    await darMeGustaDesde(app, otra.token, publicacionId);
    await con(app, otra.token)
      .delete(`/publicaciones/${publicacionId}/megusta`)
      .expect(204);
    await darMeGustaDesde(app, otra.token, publicacionId);

    expect(llamadas()).toHaveLength(1);
  });

  it('[E] si el webhook falla, el comentario se publica y la notificación se guarda', async () => {
    fetchFalso.mockRejectedValue(new Error('sin conexión'));

    await comentarDesde(app, otra.token, publicacionId);

    const { body } = await con(app, autoria.token).get(
      '/notificaciones/sin-leer',
    );
    expect(body.cantidad).toBe(1);
  });

  it('[E] si el webhook responde un error, la notificación se guarda igual', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 500 }));

    await darMeGustaDesde(app, otra.token, publicacionId);

    const { body } = await con(app, autoria.token).get(
      '/notificaciones/sin-leer',
    );
    expect(body.cantidad).toBe(1);
  });
});
