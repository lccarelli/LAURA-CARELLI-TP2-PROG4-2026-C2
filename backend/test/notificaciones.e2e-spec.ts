import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './ayudas/app.js';
import {
  comentarDesde,
  con,
  darMeGustaDesde,
  prepararEscenario,
} from './ayudas/notificaciones.js';

describe('notificaciones', () => {
  let app: INestApplication;
  let autoria: { token: string; usuario: { _id: string } };
  let otra: { token: string; usuario: { _id: string; nombreUsuario: string } };
  let publicacionId: string;

  const deLaAutoria = () => con(app, autoria.token);
  const listarComoAutoria = async (consulta = '') =>
    (await deLaAutoria().get(`/notificaciones${consulta}`).expect(200)).body;
  const sinLeer = async () =>
    (await deLaAutoria().get('/notificaciones/sin-leer').expect(200)).body
      .cantidad;

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    ({ autoria, otra, publicacionId } = await prepararEscenario(app));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('se generan al comentar y al dar me gusta', () => {
    it.each([
      ['comentario', comentarDesde],
      ['me_gusta', darMeGustaDesde],
    ])(
      '[O] %s en una publicación ajena avisa a su autoria',
      async (tipo, accion) => {
        await accion(app, otra.token, publicacionId);

        const { datos } = await listarComoAutoria();

        expect(datos).toHaveLength(1);
        expect(datos[0]).toEqual({
          _id: expect.any(String),
          tipo,
          leida: false,
          fecha: expect.any(String),
          publicacion: { _id: publicacionId, titulo: 'Título 1' },
          actor: { _id: otra.usuario._id, nombreUsuario: 'juan_p' },
        });
      },
    );

    it.each([
      ['comentario', comentarDesde],
      ['me_gusta', darMeGustaDesde],
    ])(
      '[E] %s en la propia publicación no genera nada',
      async (_tipo, accion) => {
        await accion(app, autoria.token, publicacionId);

        expect(await sinLeer()).toBe(0);
      },
    );

    it('[O] la persona que actúa no recibe nada', async () => {
      await comentarDesde(app, otra.token, publicacionId);

      const { body } = await con(app, otra.token).get('/notificaciones');

      expect(body.datos).toEqual([]);
    });

    it('[O] cada comentario genera su propia notificación', async () => {
      await comentarDesde(app, otra.token, publicacionId, 'Uno');
      await comentarDesde(app, otra.token, publicacionId, 'Dos');

      expect(await sinLeer()).toBe(2);
    });

    it('[B] quitar y volver a dar me gusta sin leer no duplica el aviso', async () => {
      await darMeGustaDesde(app, otra.token, publicacionId);
      await con(app, otra.token)
        .delete(`/publicaciones/${publicacionId}/megusta`)
        .expect(204);
      await darMeGustaDesde(app, otra.token, publicacionId);

      expect(await sinLeer()).toBe(1);
    });

    it('[S] quitar un me gusta no genera aviso', async () => {
      await darMeGustaDesde(app, otra.token, publicacionId);
      await deLaAutoria().post('/notificaciones/leer-todas').expect(200);
      await con(app, otra.token)
        .delete(`/publicaciones/${publicacionId}/megusta`)
        .expect(204);

      expect(await sinLeer()).toBe(0);
    });

    it('[S] si ya había leído el aviso, un nuevo me gusta avisa otra vez', async () => {
      await darMeGustaDesde(app, otra.token, publicacionId);
      await deLaAutoria().post('/notificaciones/leer-todas').expect(200);
      await con(app, otra.token)
        .delete(`/publicaciones/${publicacionId}/megusta`)
        .expect(204);
      await darMeGustaDesde(app, otra.token, publicacionId);

      expect(await sinLeer()).toBe(1);
    });
  });

  describe('GET /notificaciones', () => {
    it('[Z] sin avisos devuelve la lista vacía y hayMas falso', async () => {
      expect(await listarComoAutoria()).toEqual({
        datos: [],
        offset: 0,
        limit: 10,
        hayMas: false,
      });
    });

    it('[O] ordena de la más nueva a la más vieja', async () => {
      await comentarDesde(app, otra.token, publicacionId, 'Uno');
      await darMeGustaDesde(app, otra.token, publicacionId);

      const { datos } = await listarComoAutoria();

      expect(datos.map((n: { tipo: string }) => n.tipo)).toEqual([
        'me_gusta',
        'comentario',
      ]);
    });

    it('[S] pagina con offset, limit y hayMas', async () => {
      for (const mensaje of ['Uno', 'Dos', 'Tres']) {
        await comentarDesde(app, otra.token, publicacionId, mensaje);
      }

      const primera = await listarComoAutoria('?limit=2');
      const segunda = await listarComoAutoria('?limit=2&offset=2');

      expect(primera.datos).toHaveLength(2);
      expect(primera.hayMas).toBe(true);
      expect(segunda.datos).toHaveLength(1);
      expect(segunda.hayMas).toBe(false);
    });

    it('[S] soloNoLeidas deja afuera las leídas', async () => {
      await comentarDesde(app, otra.token, publicacionId, 'Uno');
      await deLaAutoria().post('/notificaciones/leer-todas').expect(200);
      await comentarDesde(app, otra.token, publicacionId, 'Dos');

      const todas = await listarComoAutoria();
      const noLeidas = await listarComoAutoria('?soloNoLeidas=true');

      expect(todas.datos).toHaveLength(2);
      expect(noLeidas.datos).toHaveLength(1);
      expect(noLeidas.datos[0].leida).toBe(false);
    });

    it.each(['?limit=abc', '?limit=51', '?offset=-1', '?soloNoLeidas=quizas'])(
      '[E] %s responde 400',
      async (consulta) => {
        await deLaAutoria().get(`/notificaciones${consulta}`).expect(400);
      },
    );

    it('[E] sin sesión responde 401', async () => {
      await request(app.getHttpServer()).get('/notificaciones').expect(401);
    });
  });

  describe('lectura', () => {
    it('[O] sin-leer cuenta sólo las pendientes', async () => {
      await comentarDesde(app, otra.token, publicacionId, 'Uno');
      await comentarDesde(app, otra.token, publicacionId, 'Dos');

      expect(await sinLeer()).toBe(2);
    });

    it('[S] marcar una como leída baja el contador y la devuelve leída', async () => {
      await comentarDesde(app, otra.token, publicacionId, 'Uno');
      await comentarDesde(app, otra.token, publicacionId, 'Dos');
      const [primera] = (await listarComoAutoria()).datos;

      const { body } = await deLaAutoria()
        .post(`/notificaciones/${primera._id}/leer`)
        .expect(200);

      expect(body.leida).toBe(true);
      expect(await sinLeer()).toBe(1);
    });

    it('[S] leer-todas marca todas y cuenta cuántas cambió', async () => {
      await comentarDesde(app, otra.token, publicacionId, 'Uno');
      await comentarDesde(app, otra.token, publicacionId, 'Dos');

      const { body } = await deLaAutoria()
        .post('/notificaciones/leer-todas')
        .expect(200);

      expect(body).toEqual({ actualizadas: 2 });
      expect(await sinLeer()).toBe(0);
    });

    it('[E] no se puede marcar la notificación de otra persona', async () => {
      await comentarDesde(app, otra.token, publicacionId);
      const [notificacion] = (await listarComoAutoria()).datos;

      await con(app, otra.token)
        .post(`/notificaciones/${notificacion._id}/leer`)
        .expect(404);

      expect(await sinLeer()).toBe(1);
    });

    it('[E] una notificación que no existe responde 404', async () => {
      await deLaAutoria()
        .post('/notificaciones/64b7f0c2a1b2c3d4e5f60718/leer')
        .expect(404);
    });

    it('[E] un id inválido responde 400', async () => {
      await deLaAutoria().post('/notificaciones/abc/leer').expect(400);
    });

    it('[E] leer-todas de una persona no toca las de otra', async () => {
      await comentarDesde(app, otra.token, publicacionId);

      await con(app, otra.token).post('/notificaciones/leer-todas').expect(200);

      expect(await sinLeer()).toBe(1);
    });
  });
});
