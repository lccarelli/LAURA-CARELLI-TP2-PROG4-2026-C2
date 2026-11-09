import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('DELETE /publicaciones/:id', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let token: string;
  let usuarioId: string;

  const eliminar = (id: string, tokenUsado: string | null = token) => {
    const solicitud = request(app.getHttpServer()).delete(
      `/publicaciones/${id}`,
    );
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };

  const listar = (tokenUsado = token) =>
    request(app.getHttpServer())
      .get('/publicaciones')
      .set('Authorization', `Bearer ${tokenUsado}`);

  const otraPersona = () =>
    registrarYObtenerSesion(app, {
      correo: 'juan@correo.com',
      nombreUsuario: 'juan_p',
    });

  beforeAll(async () => {
    app = await crearApp();
    publicaciones = app.get(getModelToken(Publicacion.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    token = sesion.token;
    usuarioId = sesion.usuario._id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('quien puede eliminar', () => {
    it('[O] quien publicó elimina su publicación y responde 204 sin cuerpo', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

      const { body } = await eliminar(creada.id).expect(204);

      expect(body).toEqual({});
    });

    it('[O] una persona con perfil administrador elimina la de otra', async () => {
      const otra = await otraPersona();
      const [ajena] = await sembrarPublicaciones(app, otra.usuario._id, 1);

      await eliminar(ajena.id, tokenDeAdministrador(usuarioId)).expect(204);

      expect((await publicaciones.findById(ajena.id))!.activa).toBe(false);
    });

    it('[E] una persona común no puede eliminar la de otra: 403 PUBLICACION_AJENA', async () => {
      const otra = await otraPersona();
      const [ajena] = await sembrarPublicaciones(app, otra.usuario._id, 1);

      const { body } = await eliminar(ajena.id).expect(403);

      expect(body.codigo).toBe('PUBLICACION_AJENA');
      expect((await publicaciones.findById(ajena.id))!.activa).toBe(true);
    });
  });

  describe('baja lógica', () => {
    it('[M] el documento queda en la base con activa en falso, no se borra', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

      await eliminar(creada.id).expect(204);

      const guardada = await publicaciones.findById(creada.id);
      expect(guardada).not.toBeNull();
      expect(guardada!.activa).toBe(false);
      expect(guardada!.titulo).toBe('Título 1');
    });

    it('[S] desaparece del listado al instante, aunque el listado estuviera en el caché', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 2);
      expect((await listar().expect(200)).body.datos).toHaveLength(2);

      await eliminar(creada.id).expect(204);

      const { body } = await listar().expect(200);
      expect(body.datos).toHaveLength(1);
      expect(body.datos[0]._id).not.toBe(creada.id);
    });

    it('[I] el detalle de una publicación eliminada responde 404', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await eliminar(creada.id).expect(204);

      await request(app.getHttpServer())
        .get(`/publicaciones/${creada.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('[M] sólo se elimina la elegida: las demás siguen', async () => {
      const [primera] = await sembrarPublicaciones(app, usuarioId, 3);

      await eliminar(primera.id).expect(204);

      expect(await publicaciones.countDocuments({ activa: true })).toBe(2);
    });

    it('[M] la imagen no se borra de Cloudinary: la baja es lógica', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

      await eliminar(creada.id).expect(204);

      expect(cloudinaryFalso.borrar).not.toHaveBeenCalled();
    });
  });

  describe('errores', () => {
    it('[E] una publicación que no existe responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
      const { body } = await eliminar('64b64b64b64b64b64b64b64b').expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] eliminar dos veces la misma responde 404 la segunda vez', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await eliminar(creada.id).expect(204);

      await eliminar(creada.id).expect(404);
    });

    it('[E] un id mal formado o con operadores responde 400', async () => {
      for (const id of ['abc', '123', '%7B%22%24ne%22%3Anull%7D']) {
        await eliminar(id).expect(400);
      }
    });

    it('[E] sin token responde 401 y no elimina nada', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

      await eliminar(creada.id, null).expect(401);

      expect((await publicaciones.findById(creada.id))!.activa).toBe(true);
    });

    it('[E] una publicación ya eliminada no admite me gusta ni quitarlo', async () => {
      const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
      await eliminar(creada.id).expect(204);

      await request(app.getHttpServer())
        .post(`/publicaciones/${creada.id}/megusta`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/publicaciones/${creada.id}/megusta`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
