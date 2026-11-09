import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Comentario } from '../src/publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { cargarComentarios } from './ayudas/comentarios.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('PUT /publicaciones/:id/comentarios/:comentarioId', () => {
  let app: INestApplication;
  let comentarios: Model<Comentario>;
  let publicaciones: Model<Publicacion>;
  let token: string;
  let usuarioId: string;
  let publicacionId: string;
  let comentarioId: string;

  const editar = (
    cuerpo: unknown = { mensaje: 'Editado' },
    ids: { publicacion?: string; comentario?: string } = {},
    tokenUsado: string | null = token,
  ) => {
    const solicitud = request(app.getHttpServer()).put(
      `/publicaciones/${ids.publicacion ?? publicacionId}/comentarios/${ids.comentario ?? comentarioId}`,
    );
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud.send(cuerpo as object);
  };

  const guardado = async () => (await comentarios.findById(comentarioId))!;

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
    comentarioId = (
      await cargarComentarios(app, publicacionId, usuarioId, 1)
    )[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('el autor edita', () => {
    it('[O] responde 200 con el mensaje nuevo, modificado en verdadero y el autor', async () => {
      const { body } = await editar().expect(200);

      expect(body).toMatchObject({
        _id: comentarioId,
        mensaje: 'Editado',
        modificado: true,
        publicacion: publicacionId,
      });
      expect(body.usuario).toMatchObject({
        _id: usuarioId,
        nombreUsuario: 'laura_c',
      });
      expect(body.usuario.clave).toBeUndefined();
      expect(body.usuario.correo).toBeUndefined();
    });

    it('[O] se guarda en la base con modificado y la fecha de la edición, sin cambiar la fecha original', async () => {
      const original = (await guardado()).fecha;
      const antes = Date.now();

      await editar().expect(200);

      const despues = await guardado();
      expect(despues.mensaje).toBe('Editado');
      expect(despues.modificado).toBe(true);
      expect(despues.fecha).toEqual(original);
      expect(despues.modificadoEn!.getTime()).toBeGreaterThanOrEqual(
        antes - 1000,
      );
    });

    it('[M] los espacios de los costados se sacan', async () => {
      const { body } = await editar({ mensaje: '   Con espacios  ' }).expect(
        200,
      );

      expect(body.mensaje).toBe('Con espacios');
    });

    it('[M] editar dos veces deja el último mensaje y sigue modificado', async () => {
      await editar({ mensaje: 'Primera' }).expect(200);
      const { body } = await editar({ mensaje: 'Segunda' }).expect(200);

      expect(body.mensaje).toBe('Segunda');
      expect(body.modificado).toBe(true);
    });

    it('[M] el listado muestra el comentario como modificado y en su mismo lugar', async () => {
      await cargarComentarios(app, publicacionId, usuarioId, 2);
      await editar({ mensaje: 'Cambiado' }).expect(200);

      const { body } = await request(app.getHttpServer())
        .get(`/publicaciones/${publicacionId}/comentarios`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const mensajes = body.datos.map(
        ({ mensaje, modificado }: { mensaje: string; modificado: boolean }) => [
          mensaje,
          modificado,
        ],
      );
      expect(mensajes).toContainEqual(['Cambiado', true]);
      expect(body.datos).toHaveLength(3);
    });

    it('[M] no cambia la cantidad de comentarios de la publicación', async () => {
      await publicaciones.updateOne(
        { _id: publicacionId },
        { cantidadComentarios: 1 },
      );

      await editar().expect(200);

      expect(
        (await publicaciones.findById(publicacionId))!.cantidadComentarios,
      ).toBe(1);
    });

    it('[B] mandar el mismo mensaje no lo marca como modificado', async () => {
      const { body } = await editar({ mensaje: 'Comentario 1' }).expect(200);

      expect(body.modificado).toBe(false);
      const despues = await guardado();
      expect(despues.modificado).toBe(false);
      expect(despues.modificadoEn).toBeUndefined();
    });

    it('[B] un mensaje de 1 carácter y uno de 500 se aceptan', async () => {
      await editar({ mensaje: 'a' }).expect(200);
      await editar({ mensaje: 'b'.repeat(500) }).expect(200);
    });
  });

  describe('lo que no se puede', () => {
    it('[E] editar el comentario de otra persona responde 403 COMENTARIO_AJENO y no cambia nada', async () => {
      const otra = await otraPersona();

      const { body } = await editar(
        { mensaje: 'Intruso' },
        {},
        otra.token,
      ).expect(403);

      expect(body.codigo).toBe('COMENTARIO_AJENO');
      const igual = await guardado();
      expect(igual.mensaje).toBe('Comentario 1');
      expect(igual.modificado).toBe(false);
    });

    it('[E] ni siquiera un administrador edita el comentario de otra persona', async () => {
      const otra = await otraPersona();

      await editar(
        { mensaje: 'Del admin' },
        {},
        tokenDeAdministrador(otra.usuario._id),
      ).expect(403);

      expect((await guardado()).mensaje).toBe('Comentario 1');
    });

    it('[E] un comentario que no existe responde 404 COMENTARIO_NO_ENCONTRADO', async () => {
      const { body } = await editar(
        { mensaje: 'Hola' },
        { comentario: '64b64b64b64b64b64b64b64b' },
      ).expect(404);

      expect(body.codigo).toBe('COMENTARIO_NO_ENCONTRADO');
    });

    it('[E] un comentario de otra publicación, pedido bajo esta, responde 404 y no se edita', async () => {
      const otraPublicacion = (
        await sembrarPublicaciones(app, usuarioId, 1)
      )[0];

      const { body } = await editar(
        { mensaje: 'Hola' },
        { publicacion: otraPublicacion.id },
      ).expect(404);

      expect(body.codigo).toBe('COMENTARIO_NO_ENCONTRADO');
      expect((await guardado()).mensaje).toBe('Comentario 1');
    });

    it('[E] una publicación que no existe responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
      const { body } = await editar(
        { mensaje: 'Hola' },
        { publicacion: '64b64b64b64b64b64b64b64b' },
      ).expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] una publicación dada de baja no deja editar sus comentarios', async () => {
      await publicaciones.updateOne({ _id: publicacionId }, { activa: false });

      await editar().expect(404);

      expect((await guardado()).mensaje).toBe('Comentario 1');
    });

    it('[E] un id mal formado o con operadores, en cualquiera de los dos lugares, responde 400', async () => {
      for (const id of ['abc', '123', '%7B%22%24ne%22%3Anull%7D']) {
        await editar({ mensaje: 'Hola' }, { publicacion: id }).expect(400);
        await editar({ mensaje: 'Hola' }, { comentario: id }).expect(400);
      }
    });

    it('[E] sin token responde 401 y no cambia nada', async () => {
      await editar({ mensaje: 'Hola' }, {}, null).expect(401);

      expect((await guardado()).mensaje).toBe('Comentario 1');
    });
  });

  describe('validación', () => {
    it('[B] vacío, sólo espacios, sin mensaje o de 501 caracteres responden 400 y no cambian nada', async () => {
      for (const cuerpo of [
        { mensaje: '' },
        { mensaje: '   ' },
        {},
        { mensaje: 'a'.repeat(501) },
      ]) {
        await editar(cuerpo).expect(400);
      }

      expect((await guardado()).mensaje).toBe('Comentario 1');
    });

    it('[S] un mensaje que no es texto, o con operadores de Mongo, responde 400', async () => {
      for (const mensaje of [
        5,
        true,
        null,
        ['hola'],
        { $set: { usuario: 1 } },
      ]) {
        await editar({ mensaje }).expect(400);
      }

      expect((await guardado()).mensaje).toBe('Comentario 1');
    });

    it('[S] no se puede mandar el autor, la fecha ni modificado en el cuerpo', async () => {
      const otra = await otraPersona();

      for (const extra of [
        { usuario: otra.usuario._id },
        { fecha: '2020-01-01' },
        { modificado: false },
        { publicacion: '64b64b64b64b64b64b64b64b' },
      ]) {
        await editar({ mensaje: 'Hola', ...extra }).expect(400);
      }

      const igual = await guardado();
      expect(String(igual.usuario)).toBe(usuarioId);
      expect(igual.mensaje).toBe('Comentario 1');
    });
  });

  describe('logs', () => {
    it('[O] deja una línea comentario_modificado con quién lo editó', async () => {
      const lineas: Record<string, unknown>[] = [];
      vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
        for (const linea of String(texto).split('\n')) {
          if (linea.startsWith('{')) {
            lineas.push(JSON.parse(linea) as Record<string, unknown>);
          }
        }
        return true;
      });

      await editar().expect(200);

      const [linea] = lineas.filter(
        ({ evento }) => evento === 'comentario_modificado',
      );
      expect(linea).toMatchObject({
        nivel: 'info',
        id_comentario: comentarioId,
        id_publicacion: publicacionId,
        id_usuario: usuarioId,
        nombre_usuario: 'laura_c',
      });
      vi.restoreAllMocks();
    });

    it('[B] si el mensaje no cambia, no deja línea de modificación', async () => {
      const lineas: Record<string, unknown>[] = [];
      vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
        for (const linea of String(texto).split('\n')) {
          if (linea.startsWith('{')) {
            lineas.push(JSON.parse(linea) as Record<string, unknown>);
          }
        }
        return true;
      });

      await editar({ mensaje: 'Comentario 1' }).expect(200);

      expect(
        lineas.filter(({ evento }) => evento === 'comentario_modificado'),
      ).toHaveLength(0);
      vi.restoreAllMocks();
    });
  });
});
