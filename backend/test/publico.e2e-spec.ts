import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { cargarComentarios } from './ayudas/comentarios.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

describe('vista pública (sin sesión)', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let usuarioId: string;

  const publico = (ruta = '') =>
    request(app.getHttpServer()).get(`/publico/publicaciones${ruta}`);

  beforeAll(async () => {
    app = await crearApp();
    publicaciones = app.get(getModelToken(Publicacion.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    usuarioId = (await registrarYObtenerSesion(app)).usuario._id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('listado', () => {
    it('[O] responde sin token con las más recientes primero y el autor público', async () => {
      await sembrarPublicaciones(app, usuarioId, 3);

      const { body } = await publico().expect(200);

      expect(
        body.datos.map(({ titulo }: { titulo: string }) => titulo),
      ).toEqual(['Título 3', 'Título 2', 'Título 1']);
      expect(body.datos[0].usuario).toMatchObject({
        nombreUsuario: 'laura_c',
        nombre: 'Laura',
      });
    });

    it('[I] no expone datos privados del autor ni marcas de ninguna persona', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);

      const { body } = await publico().expect(200);

      const [primera] = body.datos;
      expect(primera.usuario.correo).toBeUndefined();
      expect(primera.usuario.clave).toBeUndefined();
      expect(primera.usuario.fechaNacimiento).toBeUndefined();
      expect(primera.meGusta).toBeUndefined();
      expect(primera.guardada).toBeUndefined();
    });

    it('[B] por defecto devuelve 8 y respeta limit hasta 12', async () => {
      await sembrarPublicaciones(app, usuarioId, 15);

      expect((await publico().expect(200)).body.datos).toHaveLength(8);
      expect((await publico('?limit=3').expect(200)).body.datos).toHaveLength(
        3,
      );
      expect((await publico('?limit=12').expect(200)).body.datos).toHaveLength(
        12,
      );
    });

    it('[S] no incluye las publicaciones dadas de baja', async () => {
      const [primera] = await sembrarPublicaciones(app, usuarioId, 2);
      await publicaciones.updateOne({ _id: primera.id }, { activa: false });

      const { body } = await publico().expect(200);

      expect(body.datos).toHaveLength(1);
    });

    it('[Z] sin publicaciones responde una lista vacía', async () => {
      const { body } = await publico().expect(200);

      expect(body.datos).toEqual([]);
    });

    it.each([
      ['limit de 13', '?limit=13'],
      ['limit de 0', '?limit=0'],
      ['limit que no es número', '?limit=muchas'],
      ['offset (no hay paginación pública)', '?offset=5'],
      ['parámetro desconocido', '?q=tarta'],
    ])('[E] %s responde 400', async (_caso, consulta) => {
      await publico(consulta).expect(400);
    });
  });

  describe('detalle', () => {
    it('[O] devuelve la publicación completa con su autor, sin token', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

      const { body } = await publico(`/${creada.id}`).expect(200);

      expect(body).toMatchObject({
        titulo: 'Título 1',
        mensaje: 'Mensaje 1',
        usuario: { nombreUsuario: 'laura_c' },
      });
      expect(body.meGusta).toBeUndefined();
      expect(body.guardada).toBeUndefined();
    });

    it('[O] trae sólo los 3 comentarios más recientes, el último primero', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await cargarComentarios(app, creada.id, usuarioId, 5);

      const { body } = await publico(`/${creada.id}`).expect(200);

      expect(
        body.comentarios.map(({ mensaje }: { mensaje: string }) => mensaje),
      ).toEqual(['Comentario 5', 'Comentario 4', 'Comentario 3']);
    });

    it('[I] los comentarios muestran quién los escribió sin datos privados', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await cargarComentarios(app, creada.id, usuarioId, 1);

      const { body } = await publico(`/${creada.id}`).expect(200);

      expect(body.comentarios[0].usuario).toMatchObject({
        nombreUsuario: 'laura_c',
      });
      expect(body.comentarios[0].usuario.correo).toBeUndefined();
    });

    it.each([
      ['sin comentarios', 0, 0],
      ['con uno', 1, 1],
      ['con exactamente 3', 3, 3],
    ])('[B] %s devuelve %i comentarios', async (_caso, cuantos, esperados) => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await cargarComentarios(app, creada.id, usuarioId, cuantos);

      const { body } = await publico(`/${creada.id}`).expect(200);

      expect(body.comentarios).toHaveLength(esperados);
    });

    it.each([
      ['no existe', '64b64b64b64b64b64b64b64b', 404],
      ['tiene un id inválido', 'abc', 400],
    ])('[E] una publicación que %s responde %i', async (_caso, id, estado) => {
      await publico(`/${id}`).expect(estado);
    });

    it('[E] una publicación dada de baja responde 404', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await publicaciones.updateOne({ _id: creada.id }, { activa: false });

      const { body } = await publico(`/${creada.id}`).expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });
  });

  describe('sólo lectura', () => {
    it.each([
      [
        'comentar',
        'post',
        '/publicaciones/64b64b64b64b64b64b64b64b/comentarios',
      ],
      [
        'dar me gusta',
        'post',
        '/publicaciones/64b64b64b64b64b64b64b64b/megusta',
      ],
      ['guardar', 'post', '/publicaciones/64b64b64b64b64b64b64b64b/guardar'],
    ] as const)(
      '[E] sin token no se puede %s (401)',
      async (_accion, metodo, ruta) => {
        await request(app.getHttpServer())[metodo](ruta).expect(401);
      },
    );

    it('[E] la ruta pública no acepta escribir', async () => {
      await request(app.getHttpServer())
        .post('/publico/publicaciones')
        .expect(404);
      await request(app.getHttpServer())
        .delete('/publico/publicaciones/abc')
        .expect(404);
    });
  });
});
