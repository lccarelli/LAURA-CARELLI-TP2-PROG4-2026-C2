import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Compartida } from '../src/publicaciones/schemas/compartida.schema.js';
import { crearApp, webPushFalso } from './ayudas/app.js';
import { con, prepararEscenario } from './ayudas/notificaciones.js';

const URL_WEBHOOK = 'https://hooks.prueba.test/banquete';
const ENDPOINT = 'https://push.prueba.test/dispositivo-1';

describe('compartir: avisos y «sin ver»', () => {
  let app: INestApplication;
  let compartidas: Model<Compartida>;
  let escenario: Awaited<ReturnType<typeof prepararEscenario>>;
  let fetchFalso: ReturnType<typeof vi.fn>;

  const quien = () => con(app, escenario.autoria.token);
  const destino = () => con(app, escenario.otra.token);
  const compartir = (token = escenario.autoria.token) =>
    con(app, token)
      .post(`/publicaciones/${escenario.publicacionId}/compartir`, {
        usuarios: [
          token === escenario.autoria.token
            ? escenario.otra.usuario._id
            : escenario.autoria.usuario._id,
        ],
      })
      .expect(201);
  const llamadasDelWebhook = () =>
    fetchFalso.mock.calls.filter(([url]) => url === URL_WEBHOOK);

  beforeAll(async () => {
    process.env.WEBHOOK_URL = URL_WEBHOOK;
    process.env.WEBHOOK_SECRETO = 'secreto-de-prueba';
    app = await crearApp();
    compartidas = app.get(getModelToken(Compartida.name));
  });

  beforeEach(async () => {
    escenario = await prepararEscenario(app);
    fetchFalso = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchFalso);
    webPushFalso.habilitado = true;
    webPushFalso.enviar.mockReset();
    webPushFalso.enviar.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    delete process.env.WEBHOOK_URL;
    delete process.env.WEBHOOK_SECRETO;
    await app.close();
  });

  describe('la campanita', () => {
    it('[O] quien recibe una publicación compartida tiene una notificación «compartida» con quién y cuál', async () => {
      await compartir();

      const { body } = await destino().get('/notificaciones').expect(200);

      expect(body.datos).toHaveLength(1);
      expect(body.datos[0]).toMatchObject({
        tipo: 'compartida',
        leida: false,
        publicacion: { _id: escenario.publicacionId, titulo: 'Título 1' },
        actor: { nombreUsuario: 'laura_c' },
      });
    });

    it('[S] cada vez que se comparte llega una notificación nueva, aunque sea la misma publicación a la misma persona', async () => {
      await compartir();
      await compartir();

      const { body } = await destino()
        .get('/notificaciones/sin-leer')
        .expect(200);

      expect(body.cantidad).toBe(2);
    });

    it('[S] quien comparte no recibe ninguna notificación propia', async () => {
      await con(app, escenario.autoria.token)
        .post(`/publicaciones/${escenario.publicacionId}/compartir`, {
          usuarios: [escenario.otra.usuario._id],
        })
        .expect(201);

      const propias = await quien().get('/notificaciones/sin-leer').expect(200);

      expect(propias.body.cantidad).toBe(0);
    });

    it('[I] si falla el aviso, igual se comparte', async () => {
      fetchFalso.mockRejectedValue(new Error('sin red'));

      await compartir();

      expect(await compartidas.countDocuments()).toBe(1);
    });
  });

  describe('el webhook', () => {
    it('[O] avisa con el evento compartida, la publicación, quién y a quién', async () => {
      await compartir();

      expect(llamadasDelWebhook()).toHaveLength(1);
      expect(JSON.parse(llamadasDelWebhook()[0][1].body as string)).toEqual({
        evento: 'compartida',
        publicacion: { id: escenario.publicacionId, titulo: 'Título 1' },
        actor: { id: escenario.autoria.usuario._id, nombreUsuario: 'laura_c' },
        destinatario: { id: escenario.otra.usuario._id },
        fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });

    it('[S] se avisa una vez por cada vez que se comparte', async () => {
      await compartir();
      await compartir();

      expect(llamadasDelWebhook()).toHaveLength(2);
    });
  });

  describe('el dispositivo (push)', () => {
    it('[O] manda el aviso con el texto y lleva a la solapa de compartidos del perfil, a esa publicación', async () => {
      await destino()
        .post('/push/suscripciones', {
          endpoint: ENDPOINT,
          keys: { p256dh: 'clave-p256dh', auth: 'clave-auth' },
          idioma: 'es',
        })
        .expect(204);

      await compartir();

      const { notification } = webPushFalso.enviar.mock.calls[0][1] as {
        notification: {
          body: string;
          data: { onActionClick: { default: { url: string } } };
        };
      };
      expect(notification.body).toBe('laura_c te compartió «Título 1»');
      expect(notification.data.onActionClick.default.url).toBe(
        `/perfil?solapa=compartidos&publicacion=${escenario.publicacionId}`,
      );
    });
  });

  describe('GET /publicaciones/compartidas/sin-ver', () => {
    it('[Z] sin nada compartido responde 0', async () => {
      const { body } = await destino()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);

      expect(body).toEqual({ cantidad: 0 });
    });

    it('[O] cuenta lo compartido que todavía no se vio, una por cada vez', async () => {
      await compartir();
      await compartir();

      const { body } = await destino()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);

      expect(body).toEqual({ cantidad: 2 });
    });

    it('[S] quien compartió no tiene nada sin ver', async () => {
      await compartir();

      const { body } = await quien()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);

      expect(body.cantidad).toBe(0);
    });

    it('[E] sin token responde 401', async () => {
      await con(app, 'falso')
        .get('/publicaciones/compartidas/sin-ver')
        .expect(401);
    });
  });

  describe('POST /publicaciones/compartidas/marcar-vistas', () => {
    it('[O] marca todo como visto y el contador vuelve a 0', async () => {
      await compartir();
      await compartir();

      const { body } = await destino()
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(200);
      const despues = await destino()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);

      expect(body).toEqual({ actualizadas: 2 });
      expect(despues.body.cantidad).toBe(0);
    });

    it('[S] lo que se comparte después de marcar vuelve a contar', async () => {
      await compartir();
      await destino()
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(200);

      await compartir();
      const { body } = await destino()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);

      expect(body.cantidad).toBe(1);
    });

    it('[S] marcar las propias no toca las de otra persona', async () => {
      await compartir();

      await quien()
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(200);
      const { body } = await destino()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);

      expect(body.cantidad).toBe(1);
    });

    it('[S] el listado indica cuáles ya se vieron, para resaltar las nuevas', async () => {
      await compartir();
      await destino()
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(200);
      await compartir();

      const { body } = await destino()
        .get('/publicaciones/compartidas')
        .expect(200);

      expect(body.datos.map((d: { vista: boolean }) => d.vista)).toEqual([
        false,
        true,
      ]);
    });

    it('[I] lo compartido antes de que existiera el campo «vista» cuenta como no visto, se marca y deja de ser nuevo', async () => {
      await compartidas.collection.insertOne({
        de: new Types.ObjectId(escenario.autoria.usuario._id),
        a: new Types.ObjectId(escenario.otra.usuario._id),
        publicacion: new Types.ObjectId(escenario.publicacionId),
        fecha: new Date(),
      });

      const antes = await destino()
        .get('/publicaciones/compartidas')
        .expect(200);
      const cuenta = await destino()
        .get('/publicaciones/compartidas/sin-ver')
        .expect(200);
      await destino()
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(200);
      const despues = await destino()
        .get('/publicaciones/compartidas')
        .expect(200);

      expect(antes.body.datos[0].vista).toBe(false);
      expect(cuenta.body.cantidad).toBe(1);
      expect(despues.body.datos[0].vista).toBe(true);
    });

    it('[Z] sin nada que marcar responde 0 actualizadas', async () => {
      const { body } = await destino()
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(200);

      expect(body).toEqual({ actualizadas: 0 });
    });

    it('[E] sin token responde 401', async () => {
      await con(app, 'falso')
        .post('/publicaciones/compartidas/marcar-vistas')
        .expect(401);
    });

    it('[I] no choca con la ruta de compartir ni con la de una publicación', async () => {
      await destino()
        .get(`/publicaciones/${escenario.publicacionId}`)
        .expect(200);
    });
  });
});
