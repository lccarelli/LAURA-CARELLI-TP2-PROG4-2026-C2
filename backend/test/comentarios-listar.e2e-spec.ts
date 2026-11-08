import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { cargarComentarios } from './ayudas/comentarios.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

type Comentario = { _id: string; mensaje: string };

describe('GET /publicaciones/:id/comentarios', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;
  let publicacionId: string;

  const listar = (
    consulta = '',
    id = publicacionId,
    tokenUsado: string | null = token,
  ) => {
    const solicitud = request(app.getHttpServer()).get(
      `/publicaciones/${id}/comentarios${consulta}`,
    );
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };

  const mensajes = (cuerpo: { datos: Comentario[] }) =>
    cuerpo.datos.map(({ mensaje }) => mensaje);

  beforeAll(async () => {
    app = await crearApp();
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

  describe('contenido', () => {
    it('[Z] sin comentarios devuelve la lista vacía y hayMas falso', async () => {
      const { body } = await listar().expect(200);

      expect(body).toEqual({ datos: [], offset: 0, limit: 10, hayMas: false });
    });

    it('[O] devuelve el comentario con su mensaje, fecha, modificado y la autora', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 1);

      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(1);
      expect(body.datos[0]).toMatchObject({
        mensaje: 'Comentario 1',
        modificado: false,
        publicacion: publicacionId,
      });
      expect(Number.isNaN(Date.parse(body.datos[0].fecha))).toBe(false);
      expect(body.datos[0].usuario).toMatchObject({
        _id: usuarioId,
        nombreUsuario: 'laura_c',
        nombre: 'Laura',
        apellido: 'Carelli',
      });
    });

    it('[I] la autora no incluye la clave ni el correo', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 1);

      const { body } = await listar().expect(200);

      expect(body.datos[0].usuario.clave).toBeUndefined();
      expect(body.datos[0].usuario.correo).toBeUndefined();
    });

    it('[M] cada comentario muestra a su propia autora', async () => {
      const otra = await registrarYObtenerSesion(app, {
        correo: 'juan@correo.com',
        nombreUsuario: 'juan_p',
      });
      await cargarComentarios(app, publicacionId, usuarioId, 1);
      await cargarComentarios(app, publicacionId, otra.usuario._id, 1);

      const { body } = await listar().expect(200);

      expect(
        body.datos.map(
          ({ usuario }: { usuario: { nombreUsuario: string } }) =>
            usuario.nombreUsuario,
        ),
      ).toEqual(['juan_p', 'laura_c']);
    });

    it('[M] sólo trae los comentarios de esa publicación', async () => {
      const [, otra] = await sembrarPublicaciones(app, usuarioId, 2);
      await cargarComentarios(app, publicacionId, usuarioId, 2);
      await cargarComentarios(app, otra.id, usuarioId, 3);

      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(2);
      expect(
        body.datos.every(
          ({ publicacion }: { publicacion: string }) =>
            publicacion === publicacionId,
        ),
      ).toBe(true);
    });
  });

  describe('orden y paginación', () => {
    it('[M] ordena del más reciente al más antiguo', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 3);

      const { body } = await listar().expect(200);

      expect(mensajes(body)).toEqual([
        'Comentario 3',
        'Comentario 2',
        'Comentario 1',
      ]);
    });

    it('[M] con 12 comentarios, la primera página trae 10 y hayMas es verdadero', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 12);

      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(10);
      expect(body.hayMas).toBe(true);
    });

    it('[M] con offset 10 trae los 2 restantes y hayMas es falso', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 12);

      const { body } = await listar('?offset=10').expect(200);

      expect(mensajes(body)).toEqual(['Comentario 2', 'Comentario 1']);
      expect(body.hayMas).toBe(false);
    });

    it('[M] cargar más conserva el orden: la segunda página sigue a la primera', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 6);

      const primera = await listar('?limit=3').expect(200);
      const segunda = await listar('?limit=3&offset=3').expect(200);

      expect([...mensajes(primera.body), ...mensajes(segunda.body)]).toEqual([
        'Comentario 6',
        'Comentario 5',
        'Comentario 4',
        'Comentario 3',
        'Comentario 2',
        'Comentario 1',
      ]);
    });

    it('[M] con la misma fecha, las páginas no repiten ni omiten', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 12, true);

      const paginas = await Promise.all(
        [0, 5, 10].map((offset) =>
          listar(`?limit=5&offset=${offset}`).expect(200),
        ),
      );

      const ids = paginas.flatMap(({ body }) =>
        body.datos.map(({ _id }: Comentario) => _id),
      );
      expect(ids).toHaveLength(12);
      expect(new Set(ids).size).toBe(12);
      expect([...ids].sort().reverse()).toEqual(ids);
    });

    it('[S] un comentario nuevo aparece arriba de todo en la primera página', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 3);

      await request(app.getHttpServer())
        .post(`/publicaciones/${publicacionId}/comentarios`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mensaje: 'Recién llegado' })
        .expect(201);
      const { body } = await listar().expect(200);

      expect(mensajes(body)[0]).toBe('Recién llegado');
      expect(body.datos).toHaveLength(4);
    });
  });

  describe('bordes', () => {
    it('[B] limit 1 y limit 50 funcionan', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 3);

      const uno = await listar('?limit=1').expect(200);
      await listar('?limit=50').expect(200);

      expect(uno.body.datos).toHaveLength(1);
      expect(uno.body.hayMas).toBe(true);
    });

    it('[B] limit 0 y limit 51 responden 400', async () => {
      await listar('?limit=0').expect(400);
      await listar('?limit=51').expect(400);
    });

    it('[B] offset -1 responde 400', async () => {
      await listar('?offset=-1').expect(400);
    });

    it('[B] un offset más allá del final devuelve la lista vacía', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 3);

      const { body } = await listar('?offset=100').expect(200);

      expect(body.datos).toEqual([]);
      expect(body.hayMas).toBe(false);
    });

    it('[B] con exactamente limit comentarios, hayMas es falso', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 10);

      const { body } = await listar('?limit=10').expect(200);

      expect(body.datos).toHaveLength(10);
      expect(body.hayMas).toBe(false);
    });
  });

  describe('contrato', () => {
    it('[I] responde con datos, offset, limit y hayMas', async () => {
      const { body } = await listar('?offset=2&limit=5').expect(200);

      expect(Object.keys(body).sort()).toEqual([
        'datos',
        'hayMas',
        'limit',
        'offset',
      ]);
      expect(body.offset).toBe(2);
      expect(body.limit).toBe(5);
    });
  });

  describe('errores', () => {
    it('[E] una publicación que no existe responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
      const { body } = await listar('', '64b64b64b64b64b64b64b64b').expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] una publicación dada de baja responde 404, aunque tenga comentarios', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 2);
      const publicaciones: Model<Publicacion> = app.get(
        getModelToken(Publicacion.name),
      );
      await publicaciones.updateOne({ _id: publicacionId }, { activa: false });

      await listar().expect(404);
    });

    it('[E] un id mal formado o con operadores responde 400', async () => {
      for (const id of ['abc', '123', '%7B%22%24ne%22%3Anull%7D']) {
        await listar('', id).expect(400);
      }
    });

    it('[E] sin token responde 401', async () => {
      await listar('', publicacionId, null).expect(401);
    });

    it('[E] un limit que no es número, o un parámetro desconocido, responde 400', async () => {
      await listar('?limit=abc').expect(400);
      await listar('?orden=fecha').expect(400);
      await listar('?usuario=64b64b64b64b64b64b64b64b').expect(400);
    });
  });
});
