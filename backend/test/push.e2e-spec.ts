import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { SuscripcionPush } from '../src/push/schemas/suscripcion-push.schema.js';
import { crearApp, webPushFalso } from './ayudas/app.js';
import {
  comentarDesde,
  con,
  darMeGustaDesde,
  prepararEscenario,
} from './ayudas/notificaciones.js';

const ENDPOINT = 'https://push.prueba.test/dispositivo-1';
const OTRO_ENDPOINT = 'https://push.prueba.test/dispositivo-2';
const suscripcion = (endpoint = ENDPOINT, extra: object = {}) => ({
  endpoint,
  keys: { p256dh: 'clave-p256dh', auth: 'clave-auth' },
  ...extra,
});

describe('push', () => {
  let app: INestApplication;
  let suscripciones: Model<SuscripcionPush>;
  let escenario: Awaited<ReturnType<typeof prepararEscenario>>;

  const autoria = () => con(app, escenario.autoria.token);
  const otra = () => con(app, escenario.otra.token);
  const contenidoEnviado = (llamada = 0) =>
    webPushFalso.enviar.mock.calls[llamada][1] as {
      notification: {
        title: string;
        body: string;
        icon: string;
        data: { onActionClick: { default: { url: string } } };
      };
    };

  beforeAll(async () => {
    app = await crearApp();
    suscripciones = app.get(getModelToken(SuscripcionPush.name));
  });

  beforeEach(async () => {
    escenario = await prepararEscenario(app);
    webPushFalso.habilitado = true;
    webPushFalso.enviar.mockReset();
    webPushFalso.enviar.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /push/clave-publica', () => {
    it('[O] devuelve la clave pública para suscribirse', async () => {
      const { body } = await autoria().get('/push/clave-publica').expect(200);

      expect(body).toEqual({ clavePublica: 'clave-publica-de-prueba' });
    });

    it('[Z] sin claves configuradas devuelve null', async () => {
      webPushFalso.habilitado = false;

      const { body } = await autoria().get('/push/clave-publica').expect(200);

      expect(body).toEqual({ clavePublica: null });
    });

    it('[E] sin sesión responde 401', async () => {
      await request(app.getHttpServer()).get('/push/clave-publica').expect(401);
    });
  });

  describe('suscripciones', () => {
    it('[O] guarda la suscripción de este dispositivo', async () => {
      await autoria()
        .post('/push/suscripciones', suscripcion(ENDPOINT, { idioma: 'en' }))
        .expect(204);

      expect(
        await suscripciones.findOne({ endpoint: ENDPOINT }).lean(),
      ).toMatchObject({
        p256dh: 'clave-p256dh',
        auth: 'clave-auth',
        idioma: 'en',
      });
    });

    it('[B] suscribir dos veces el mismo dispositivo no lo duplica', async () => {
      await autoria().post('/push/suscripciones', suscripcion()).expect(204);
      await autoria().post('/push/suscripciones', suscripcion()).expect(204);

      expect(await suscripciones.countDocuments()).toBe(1);
    });

    it('[S] si otra persona usa el mismo dispositivo, la suscripción pasa a ella', async () => {
      await autoria().post('/push/suscripciones', suscripcion()).expect(204);
      await otra().post('/push/suscripciones', suscripcion()).expect(204);

      const guardadas = await suscripciones.find().lean();
      expect(guardadas).toHaveLength(1);
      expect(String(guardadas[0].usuario)).toBe(escenario.otra.usuario._id);
    });

    it.each([
      ['un endpoint que no es https', suscripcion('http://push.test/x')],
      ['un endpoint que no es una dirección', suscripcion('hola')],
      ['sin claves', { endpoint: ENDPOINT }],
      [
        'con claves vacías',
        { endpoint: ENDPOINT, keys: { p256dh: '', auth: '' } },
      ],
      ['con un idioma desconocido', suscripcion(ENDPOINT, { idioma: 'fr' })],
      ['con un campo desconocido', suscripcion(ENDPOINT, { usuario: 'otro' })],
    ])('[E] %s responde 400', async (_nombre, cuerpo) => {
      await autoria().post('/push/suscripciones', cuerpo).expect(400);

      expect(await suscripciones.countDocuments()).toBe(0);
    });

    it('[E] sin sesión responde 401', async () => {
      await request(app.getHttpServer())
        .post('/push/suscripciones')
        .send(suscripcion())
        .expect(401);
    });

    it('[S] quitar la suscripción la borra', async () => {
      await autoria().post('/push/suscripciones', suscripcion()).expect(204);

      await con(app, escenario.autoria.token)
        .delete('/push/suscripciones')
        .send({ endpoint: ENDPOINT })
        .expect(204);

      expect(await suscripciones.countDocuments()).toBe(0);
    });

    it('[E] no se puede quitar la suscripción de otra persona', async () => {
      await autoria().post('/push/suscripciones', suscripcion()).expect(204);

      await otra()
        .delete('/push/suscripciones')
        .send({ endpoint: ENDPOINT })
        .expect(204);

      expect(await suscripciones.countDocuments()).toBe(1);
    });

    it('[E] quitar con un endpoint inválido responde 400', async () => {
      await autoria()
        .delete('/push/suscripciones')
        .send({ endpoint: 'x' })
        .expect(400);
    });
  });

  describe('envío al generarse un aviso', () => {
    const suscribirAutoria = (endpoint = ENDPOINT, idioma = 'es') =>
      autoria()
        .post('/push/suscripciones', suscripcion(endpoint, { idioma }))
        .expect(204);

    it('[O] un comentario manda el aviso al dispositivo, con texto y destino', async () => {
      await suscribirAutoria();

      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(webPushFalso.enviar).toHaveBeenCalledTimes(1);
      expect(webPushFalso.enviar.mock.calls[0][0]).toEqual({
        endpoint: ENDPOINT,
        keys: { p256dh: 'clave-p256dh', auth: 'clave-auth' },
      });
      const { notification } = contenidoEnviado();
      expect(notification.title).toBe('Banquete');
      expect(notification.body).toBe('juan_p comentó en «Título 1»');
      expect(notification.icon).toContain('/icons/icon-192.png');
      expect(notification.data.onActionClick.default.url).toBe(
        `/publicaciones/${escenario.publicacionId}#comentarios`,
      );
    });

    it('[O] un me gusta manda el aviso y lleva a la publicación', async () => {
      await suscribirAutoria();

      await darMeGustaDesde(app, escenario.otra.token, escenario.publicacionId);

      const { notification } = contenidoEnviado();
      expect(notification.body).toBe('A juan_p le gustó «Título 1»');
      expect(notification.data.onActionClick.default.url).toBe(
        `/publicaciones/${escenario.publicacionId}`,
      );
    });

    it('[S] el texto sale en el idioma que eligió ese dispositivo', async () => {
      await suscribirAutoria(ENDPOINT, 'en');

      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(contenidoEnviado().notification.body).toBe(
        'juan_p commented on “Título 1”',
      );
    });

    it('[S] con varios dispositivos manda a cada uno', async () => {
      await suscribirAutoria(ENDPOINT);
      await suscribirAutoria(OTRO_ENDPOINT);

      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      const destinos = webPushFalso.enviar.mock.calls.map(
        ([destino]) => (destino as { endpoint: string }).endpoint,
      );
      expect(destinos.sort((a, b) => a.localeCompare(b))).toEqual([
        ENDPOINT,
        OTRO_ENDPOINT,
      ]);
    });

    it('[Z] sin dispositivos suscriptos no manda nada', async () => {
      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(webPushFalso.enviar).not.toHaveBeenCalled();
    });

    it('[E] una acción sobre la propia publicación no manda nada', async () => {
      await suscribirAutoria();

      await comentarDesde(
        app,
        escenario.autoria.token,
        escenario.publicacionId,
      );

      expect(webPushFalso.enviar).not.toHaveBeenCalled();
    });

    it('[E] el aviso va sólo a quien corresponde', async () => {
      await otra()
        .post('/push/suscripciones', suscripcion(OTRO_ENDPOINT))
        .expect(204);

      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(webPushFalso.enviar).not.toHaveBeenCalled();
    });

    it('[B] un me gusta repetido sin leer no vuelve a mandar el aviso', async () => {
      await suscribirAutoria();
      await darMeGustaDesde(app, escenario.otra.token, escenario.publicacionId);
      await otra()
        .delete(`/publicaciones/${escenario.publicacionId}/megusta`)
        .expect(204);
      await darMeGustaDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(webPushFalso.enviar).toHaveBeenCalledTimes(1);
    });

    it('[E] sin claves configuradas no intenta mandar nada y la notificación se guarda', async () => {
      await suscribirAutoria();
      webPushFalso.habilitado = false;

      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(webPushFalso.enviar).not.toHaveBeenCalled();
      const { body } = await autoria()
        .get('/notificaciones/sin-leer')
        .expect(200);
      expect(body.cantidad).toBe(1);
    });

    it.each([404, 410])(
      '[S] si el dispositivo ya no existe (%i), se borra su suscripción',
      async (codigo) => {
        await suscribirAutoria();
        webPushFalso.enviar.mockRejectedValue(
          Object.assign(new Error('caducó'), { statusCode: codigo }),
        );

        await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

        expect(await suscripciones.countDocuments()).toBe(0);
      },
    );

    it('[E] si el envío falla por otro motivo, la suscripción queda y la notificación se guarda', async () => {
      await suscribirAutoria();
      webPushFalso.enviar.mockRejectedValue(
        Object.assign(new Error('caído'), { statusCode: 500 }),
      );

      await comentarDesde(app, escenario.otra.token, escenario.publicacionId);

      expect(await suscripciones.countDocuments()).toBe(1);
      const { body } = await autoria()
        .get('/notificaciones/sin-leer')
        .expect(200);
      expect(body.cantidad).toBe(1);
    });
  });
});
