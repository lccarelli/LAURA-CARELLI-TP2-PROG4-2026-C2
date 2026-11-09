import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Comentario } from '../src/publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

describe('POST /publicaciones/:id/comentarios', () => {
  let app: INestApplication;
  let comentarios: Model<Comentario>;
  let publicaciones: Model<Publicacion>;
  let token: string;
  let usuarioId: string;
  let publicacionId: string;

  const comentar = (
    cuerpo: unknown = { mensaje: 'Me encantó' },
    id = publicacionId,
    tokenUsado: string | null = token,
  ) => {
    const solicitud = request(app.getHttpServer()).post(
      `/publicaciones/${id}/comentarios`,
    );
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud.send(cuerpo as object);
  };

  const cantidad = async () =>
    (await publicaciones.findById(publicacionId))!.cantidadComentarios;

  const otraPersona = () =>
    registrarYObtenerSesion(app, {
      correo: 'juan@correo.com',
      nombreUsuario: 'juan_p',
    });

  beforeAll(async () => {
    app = await crearApp();
    comentarios = app.get(getModelToken(Comentario.name));
    publicaciones = app.get(getModelToken(Publicacion.name));
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

  describe('alta', () => {
    it('[O] crea el comentario: 201 con el mensaje, el autor, la fecha y modificado en falso', async () => {
      const antes = Date.now();

      const { body } = await comentar().expect(201);

      expect(body).toMatchObject({
        mensaje: 'Me encantó',
        modificado: false,
        publicacion: publicacionId,
      });
      expect(body.usuario).toMatchObject({
        _id: usuarioId,
        nombreUsuario: 'laura_c',
      });
      expect(Date.parse(body.fecha)).toBeGreaterThanOrEqual(antes - 1000);
      expect(Date.parse(body.fecha)).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('[I] el autor no incluye la clave ni el correo', async () => {
      const { body } = await comentar().expect(201);

      expect(body.usuario.clave).toBeUndefined();
      expect(body.usuario.correo).toBeUndefined();
    });

    it('[O] se guarda en la base con la publicación y el autor', async () => {
      await comentar().expect(201);

      const [guardado] = await comentarios.find().lean();
      expect(String(guardado.publicacion)).toBe(publicacionId);
      expect(String(guardado.usuario)).toBe(usuarioId);
      expect(guardado.mensaje).toBe('Me encantó');
      expect(guardado.modificado).toBe(false);
    });

    it('[M] los espacios de los costados se sacan', async () => {
      const { body } = await comentar({ mensaje: '   Rico   ' }).expect(201);

      expect(body.mensaje).toBe('Rico');
    });

    it('[M] varios comentarios de la misma persona se guardan todos', async () => {
      await comentar({ mensaje: 'Uno' }).expect(201);
      await comentar({ mensaje: 'Dos' }).expect(201);
      await comentar({ mensaje: 'Tres' }).expect(201);

      expect(await comentarios.countDocuments()).toBe(3);
      expect(await cantidad()).toBe(3);
    });

    it('[M] dos personas comentan la misma publicación, cada una con lo suyo', async () => {
      const otra = await otraPersona();

      await comentar({ mensaje: 'De Laura' }).expect(201);
      const { body } = await comentar(
        { mensaje: 'De Juan' },
        publicacionId,
        otra.token,
      ).expect(201);

      expect(body.usuario.nombreUsuario).toBe('juan_p');
      expect(await cantidad()).toBe(2);
    });

    it('[B] cinco comentarios a la vez suman cinco', async () => {
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          comentar({ mensaje: `Comentario ${i}` }).expect(201),
        ),
      );

      expect(await cantidad()).toBe(5);
      expect(await comentarios.countDocuments()).toBe(5);
    });
  });

  describe('contador y listado', () => {
    it('[O] suma uno a cantidadComentarios de la publicación', async () => {
      await comentar().expect(201);

      expect(await cantidad()).toBe(1);
    });

    it('[S] el listado y el detalle muestran el contador nuevo al instante, aunque estuvieran en el caché', async () => {
      const listar = () =>
        request(app.getHttpServer())
          .get('/publicaciones')
          .set('Authorization', `Bearer ${token}`);
      expect((await listar()).body.datos[0].cantidadComentarios).toBe(0);

      await comentar().expect(201);

      expect((await listar()).body.datos[0].cantidadComentarios).toBe(1);
      const detalle = await request(app.getHttpServer())
        .get(`/publicaciones/${publicacionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(detalle.body.cantidadComentarios).toBe(1);
    });

    it('[M] sólo suma en la publicación comentada', async () => {
      const [, otra] = await sembrarPublicaciones(app, usuarioId, 2);

      await comentar({ mensaje: 'Hola' }, otra.id).expect(201);

      expect(await cantidad()).toBe(0);
      expect((await publicaciones.findById(otra.id))!.cantidadComentarios).toBe(
        1,
      );
    });
  });

  describe('bordes', () => {
    it('[B] un mensaje de 1 carácter y uno de 500 se aceptan', async () => {
      await comentar({ mensaje: 'a' }).expect(201);
      await comentar({ mensaje: 'b'.repeat(500) }).expect(201);
    });

    it('[B] un mensaje de 501 caracteres responde 400 y no guarda nada', async () => {
      const { body } = await comentar({ mensaje: 'a'.repeat(501) }).expect(400);

      expect(body.codigo).toBe('DATOS_INVALIDOS');
      expect(await comentarios.countDocuments()).toBe(0);
      expect(await cantidad()).toBe(0);
    });

    it('[B] vacío, sólo espacios o sin cuerpo responden 400', async () => {
      await comentar({ mensaje: '' }).expect(400);
      await comentar({ mensaje: '    ' }).expect(400);
      await comentar({}).expect(400);
      await request(app.getHttpServer())
        .post(`/publicaciones/${publicacionId}/comentarios`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(await comentarios.countDocuments()).toBe(0);
    });
  });

  describe('errores y seguridad', () => {
    it('[E] una publicación que no existe responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
      const { body } = await comentar(
        { mensaje: 'Hola' },
        '64b64b64b64b64b64b64b64b',
      ).expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
      expect(await comentarios.countDocuments()).toBe(0);
    });

    it('[E] una publicación dada de baja responde 404 y no suma', async () => {
      await publicaciones.updateOne({ _id: publicacionId }, { activa: false });

      await comentar().expect(404);

      expect(await comentarios.countDocuments()).toBe(0);
      expect(await cantidad()).toBe(0);
    });

    it('[E] un id mal formado o con operadores responde 400', async () => {
      for (const id of ['abc', '123', '%7B%22%24ne%22%3Anull%7D']) {
        await comentar({ mensaje: 'Hola' }, id).expect(400);
      }
    });

    it('[E] sin token responde 401 y no guarda nada', async () => {
      await comentar({ mensaje: 'Hola' }, publicacionId, null).expect(401);

      expect(await comentarios.countDocuments()).toBe(0);
    });

    it('[S] un mensaje que no es texto, o con operadores de Mongo, responde 400', async () => {
      for (const mensaje of [
        5,
        true,
        null,
        ['hola'],
        { $ne: null },
        { $gt: '' },
      ]) {
        await comentar({ mensaje }).expect(400);
      }

      expect(await comentarios.countDocuments()).toBe(0);
    });

    it('[S] no se puede mandar el autor, la fecha ni modificado en el cuerpo', async () => {
      const otra = await otraPersona();

      for (const extra of [
        { usuario: otra.usuario._id },
        { fecha: '2020-01-01' },
        { modificado: true },
        { publicacion: '64b64b64b64b64b64b64b64b' },
      ]) {
        await comentar({ mensaje: 'Hola', ...extra }).expect(400);
      }

      expect(await comentarios.countDocuments()).toBe(0);
    });

    it('[S] un texto con HTML se guarda tal cual, sin interpretarse', async () => {
      const { body } = await comentar({
        mensaje: '<script>alert(1)</script>',
      }).expect(201);

      expect(body.mensaje).toBe('<script>alert(1)</script>');
    });
  });

  describe('logs', () => {
    it('[O] deja una línea comentario_creado con quién comentó y de quién es la publicación', async () => {
      const otra = await otraPersona();
      const lineas: Record<string, unknown>[] = [];
      vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
        for (const linea of String(texto).split('\n')) {
          if (linea.startsWith('{')) {
            lineas.push(JSON.parse(linea) as Record<string, unknown>);
          }
        }
        return true;
      });

      const { body } = await comentar(
        { mensaje: 'Hola' },
        publicacionId,
        otra.token,
      ).expect(201);

      const [linea] = lineas.filter(
        ({ evento }) => evento === 'comentario_creado',
      );
      expect(linea).toMatchObject({
        nivel: 'info',
        id_comentario: body._id,
        id_publicacion: publicacionId,
        id_usuario: otra.usuario._id,
        nombre_usuario: 'juan_p',
        id_autor: usuarioId,
        nombre_autor: 'laura_c',
      });
      vi.restoreAllMocks();
    });
  });
});
