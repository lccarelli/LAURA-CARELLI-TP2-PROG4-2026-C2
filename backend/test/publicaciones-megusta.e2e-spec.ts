import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { MeGusta } from '../src/publicaciones/schemas/me-gusta.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

describe('me gusta de una publicación', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let megusta: Model<MeGusta>;
  let token: string;
  let usuarioId: string;
  let publicacionId: string;

  const dar = (id = publicacionId, tokenUsado: string | null = token) => {
    const solicitud = request(app.getHttpServer()).post(
      `/publicaciones/${id}/megusta`,
    );
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };

  const quitar = (id = publicacionId, tokenUsado: string | null = token) => {
    const solicitud = request(app.getHttpServer()).delete(
      `/publicaciones/${id}/megusta`,
    );
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };

  const cantidad = async () =>
    (await publicaciones.findById(publicacionId))!.cantidadMeGusta;

  const detalle = (tokenUsado = token) =>
    request(app.getHttpServer())
      .get(`/publicaciones/${publicacionId}`)
      .set('Authorization', `Bearer ${tokenUsado}`);

  const otraPersona = () =>
    registrarYObtenerSesion(app, {
      correo: 'juan@correo.com',
      nombreUsuario: 'juan_p',
    });

  beforeAll(async () => {
    app = await crearApp();
    publicaciones = app.get(getModelToken(Publicacion.name));
    megusta = app.get(getModelToken(MeGusta.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    token = sesion.token;
    usuarioId = sesion.usuario._id;
    publicacionId = (await sembrarPublicaciones(app, usuarioId, 1))[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /publicaciones/:id/megusta', () => {
    it('[O] da me gusta: 201, avisa que ya lo diste y suma uno', async () => {
      const { body } = await dar().expect(201);

      expect(body).toEqual({ meGusta: true, cantidadMeGusta: 1 });
      expect(await cantidad()).toBe(1);
      expect(await megusta.countDocuments()).toBe(1);
    });

    it('[I] el detalle y el listado marcan que yo di me gusta', async () => {
      await dar().expect(201);

      const unica = await detalle().expect(200);
      const lista = await request(app.getHttpServer())
        .get('/publicaciones')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(unica.body.meGusta).toBe(true);
      expect(unica.body.cantidadMeGusta).toBe(1);
      expect(lista.body.datos[0].meGusta).toBe(true);
    });

    it('[E] un segundo me gusta del mismo usuario responde 409 ME_GUSTA_REPETIDO y no suma', async () => {
      await dar().expect(201);

      const { body } = await dar().expect(409);

      expect(body.codigo).toBe('ME_GUSTA_REPETIDO');
      expect(await cantidad()).toBe(1);
      expect(await megusta.countDocuments()).toBe(1);
    });

    it('[B] dos pedidos a la vez del mismo usuario: uno da 201, el otro 409, y suma uno solo', async () => {
      const respuestas = await Promise.all([dar(), dar()]);

      expect(respuestas.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(await cantidad()).toBe(1);
      expect(await megusta.countDocuments()).toBe(1);
    });

    it('[M] dos personas dan me gusta: se suman y cada una ve el suyo', async () => {
      const otra = await otraPersona();

      await dar().expect(201);
      await dar(publicacionId, otra.token).expect(201);

      expect(await cantidad()).toBe(2);
      expect((await detalle()).body.meGusta).toBe(true);
      expect((await detalle(otra.token)).body.meGusta).toBe(true);
    });

    it('[S] quien no dio me gusta ve meGusta en falso, aunque el listado esté en el caché', async () => {
      const otra = await otraPersona();
      const listar = (tokenUsado: string) =>
        request(app.getHttpServer())
          .get('/publicaciones')
          .set('Authorization', `Bearer ${tokenUsado}`);

      await dar().expect(201);
      const mio = await listar(token).expect(200);
      const ajeno = await listar(otra.token).expect(200);

      expect(mio.body.datos[0].meGusta).toBe(true);
      expect(ajeno.body.datos[0].meGusta).toBe(false);
      expect(ajeno.body.datos[0].cantidadMeGusta).toBe(1);
    });

    it('[I] la persona sale del token: un usuario en el cuerpo se ignora', async () => {
      const otra = await otraPersona();

      await dar().send({ usuario: otra.usuario._id }).expect(201);

      const guardado = await megusta.findOne();
      expect(String(guardado!.usuario)).toBe(usuarioId);
    });
  });

  describe('DELETE /publicaciones/:id/megusta', () => {
    it('[O] quita el me gusta: 204 y resta uno', async () => {
      await dar().expect(201);

      await quitar().expect(204);

      expect(await cantidad()).toBe(0);
      expect(await megusta.countDocuments()).toBe(0);
      expect((await detalle()).body.meGusta).toBe(false);
    });

    it('[E] quitar un me gusta que no di responde 404 ME_GUSTA_INEXISTENTE y el contador no baja de cero', async () => {
      const { body } = await quitar().expect(404);

      expect(body.codigo).toBe('ME_GUSTA_INEXISTENTE');
      expect(await cantidad()).toBe(0);
    });

    it('[E] no se puede quitar el me gusta de otra persona', async () => {
      const otra = await otraPersona();
      await dar(publicacionId, otra.token).expect(201);

      await quitar().expect(404);

      expect(await cantidad()).toBe(1);
      expect(await megusta.countDocuments()).toBe(1);
    });

    it('[M] dar, quitar y volver a dar funciona', async () => {
      await dar().expect(201);
      await quitar().expect(204);

      const { body } = await dar().expect(201);

      expect(body.cantidadMeGusta).toBe(1);
    });

    it('[M] quitar el propio no afecta el de otra persona', async () => {
      const otra = await otraPersona();
      await dar().expect(201);
      await dar(publicacionId, otra.token).expect(201);

      await quitar().expect(204);

      expect(await cantidad()).toBe(1);
      expect((await detalle(otra.token)).body.meGusta).toBe(true);
    });
  });

  describe('errores', () => {
    it('[E] una publicación que no existe responde 404 al dar y al quitar', async () => {
      const inexistente = '64b64b64b64b64b64b64b64b';

      const dado = await dar(inexistente).expect(404);
      await quitar(inexistente).expect(404);

      expect(dado.body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] un id mal formado o con operadores responde 400', async () => {
      for (const id of ['abc', '123', '%7B%22%24ne%22%3Anull%7D']) {
        await dar(id).expect(400);
        await quitar(id).expect(400);
      }
    });

    it('[E] sin token responde 401 y no guarda nada', async () => {
      await dar(publicacionId, null).expect(401);
      await quitar(publicacionId, null).expect(401);

      expect(await megusta.countDocuments()).toBe(0);
    });
  });
});
