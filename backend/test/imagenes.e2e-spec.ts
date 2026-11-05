import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Destino } from '../src/imagenes/destinos.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  PUBLIC_ID_IMAGEN_SUBIDA,
  URL_IMAGEN_SUBIDA,
  pngDeTamano,
  registrarYObtenerSesion,
} from './ayudas/datos.js';

describe('/imagenes', () => {
  let app: INestApplication;
  let token: string;
  let usuarios: Model<Usuario>;

  const con = (solicitud: request.Test, credencial = token) =>
    solicitud.set('Authorization', `Bearer ${credencial}`);

  const subir = (
    contenido: Buffer = PNG,
    tipo = 'image/png',
    credencial = token,
  ) =>
    con(
      request(app.getHttpServer())
        .post('/imagenes')
        .attach('imagen', contenido, { filename: 'foto', contentType: tipo }),
      credencial,
    );

  const obtener = (id: string) =>
    con(request(app.getHttpServer()).get(`/imagenes/${id}`));
  const borrar = (id: string, credencial = token) =>
    con(request(app.getHttpServer()).delete(`/imagenes/${id}`), credencial);

  beforeAll(async () => {
    app = await crearApp();
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    token = (await registrarYObtenerSesion(app)).token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /imagenes', () => {
    it('[O] sube la imagen y devuelve el documento con la URL', async () => {
      const { body } = await subir().expect(201);

      expect(body.url).toBe(URL_IMAGEN_SUBIDA);
      expect(body.publicId).toBe(PUBLIC_ID_IMAGEN_SUBIDA);
      expect(body.mimetype).toBe('image/png');
      expect(body.destino).toBe(Destino.GALERIA);
      const [, destino, nombre] = cloudinaryFalso.subir.mock.calls[0];
      expect(destino).toBe(Destino.GALERIA);
      expect(nombre).toMatch(new RegExp(`^${body.usuario}-galeria-\\d+$`));
      expect(body.tamano).toBe(PNG.length);
      expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(1);
    });

    it('[Z] sin archivo responde IMAGEN_REQUERIDA', async () => {
      const { body } = await con(
        request(app.getHttpServer()).post('/imagenes'),
      ).expect(400);

      expect(body.codigo).toBe('IMAGEN_REQUERIDA');
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[I] un archivo que no es imagen responde IMAGEN_TIPO_INVALIDO', async () => {
      const { body } = await subir(Buffer.from('texto'), 'text/plain').expect(
        400,
      );

      expect(body.codigo).toBe('IMAGEN_TIPO_INVALIDO');
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[B] una imagen de 2 MB más 1 byte responde 413', async () => {
      await subir(pngDeTamano(2 * 1024 * 1024 + 1)).expect(413);

      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[E] sin token responde TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/imagenes')
        .attach('imagen', PNG, { filename: 'foto', contentType: 'image/png' })
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[E] si Cloudinary falla responde 500 y no queda documento', async () => {
      cloudinaryFalso.subir.mockRejectedValueOnce(new Error('caído'));

      await subir().expect(500);

      const { body } = await con(
        request(app.getHttpServer()).get('/imagenes'),
      ).expect(200);
      expect(body.datos).toEqual([]);
    });
  });

  describe('GET /imagenes', () => {
    it('[Z] sin imágenes devuelve la lista vacía', async () => {
      const { body } = await con(
        request(app.getHttpServer()).get('/imagenes'),
      ).expect(200);

      expect(body).toEqual({ datos: [], offset: 0, limit: 10, hayMas: false });
    });

    it('[O] lista sólo las imágenes propias, la más nueva primero', async () => {
      const primera = (await subir().expect(201)).body;
      const segunda = (await subir().expect(201)).body;
      const otra = await registrarYObtenerSesion(app, {
        correo: 'otra@correo.com',
        nombreUsuario: 'otra_c',
      });
      await subir(PNG, 'image/png', otra.token).expect(201);

      const { body } = await con(
        request(app.getHttpServer()).get('/imagenes'),
      ).expect(200);

      expect(body.datos.map((i: { _id: string }) => i._id)).toEqual([
        segunda._id,
        primera._id,
      ]);
    });

    it('[O] filtra por destino', async () => {
      await subir().expect(201);
      await con(
        request(app.getHttpServer())
          .post('/publicaciones')
          .field('tipo', 'tip')
          .field('titulo', 'Con foto')
          .field('mensaje', 'Mirá')
          .attach('imagen', PNG, {
            filename: 'foto.png',
            contentType: 'image/png',
          }),
      ).expect(201);

      const galeria = await con(
        request(app.getHttpServer()).get('/imagenes?destino=galeria'),
      ).expect(200);
      const publicaciones = await con(
        request(app.getHttpServer()).get('/imagenes?destino=publicaciones'),
      ).expect(200);
      const perfiles = await con(
        request(app.getHttpServer()).get('/imagenes?destino=perfiles'),
      ).expect(200);

      expect(galeria.body.datos).toHaveLength(1);
      expect(publicaciones.body.datos).toHaveLength(1);
      expect(perfiles.body.datos).toHaveLength(0);
    });

    it('[E] un destino desconocido responde 400', async () => {
      await con(
        request(app.getHttpServer()).get('/imagenes?destino=otro'),
      ).expect(400);
    });

    it('[B] pagina con offset y limit e indica hayMas', async () => {
      for (let i = 0; i < 3; i++) await subir().expect(201);

      const { body } = await con(
        request(app.getHttpServer()).get('/imagenes?limit=2'),
      ).expect(200);

      expect(body.datos).toHaveLength(2);
      expect(body.hayMas).toBe(true);
    });

    it('[E] un limit de 51 responde 400', async () => {
      await con(request(app.getHttpServer()).get('/imagenes?limit=51')).expect(
        400,
      );
    });

    it('[E] sin token responde TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/imagenes')
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
    });
  });

  describe('GET /imagenes/:id', () => {
    it('[O] devuelve el documento', async () => {
      const { body: creada } = await subir().expect(201);

      const { body } = await obtener(creada._id).expect(200);

      expect(body._id).toBe(creada._id);
      expect(body.url).toBe(URL_IMAGEN_SUBIDA);
    });

    it('[E] un id inexistente responde IMAGEN_NO_ENCONTRADA', async () => {
      const { body } = await obtener('64b7f0f0f0f0f0f0f0f0f0f0').expect(404);

      expect(body.codigo).toBe('IMAGEN_NO_ENCONTRADA');
    });

    it('[E] un id mal formado responde 400', async () => {
      await obtener('abc').expect(400);
    });
  });

  describe('DELETE /imagenes/:id', () => {
    it('[O] borra el archivo en Cloudinary y el documento', async () => {
      const { body: creada } = await subir().expect(201);

      await borrar(creada._id).expect(204);

      expect(cloudinaryFalso.borrar).toHaveBeenCalledWith(
        PUBLIC_ID_IMAGEN_SUBIDA,
      );
      await obtener(creada._id).expect(404);
    });

    it('[E] la imagen de otro usuario responde IMAGEN_AJENA y no se borra', async () => {
      const { body: creada } = await subir().expect(201);
      const otra = await registrarYObtenerSesion(app, {
        correo: 'otra@correo.com',
        nombreUsuario: 'otra_c',
      });

      const { body } = await borrar(creada._id, otra.token).expect(403);

      expect(body.codigo).toBe('IMAGEN_AJENA');
      expect(cloudinaryFalso.borrar).not.toHaveBeenCalled();
      await obtener(creada._id).expect(200);
    });

    it('[E] una imagen usada en una publicación responde IMAGEN_EN_USO', async () => {
      await con(
        request(app.getHttpServer())
          .post('/publicaciones')
          .field('tipo', 'tip')
          .field('titulo', 'Con foto')
          .field('mensaje', 'Mirá')
          .attach('imagen', PNG, {
            filename: 'foto.png',
            contentType: 'image/png',
          }),
      ).expect(201);
      const { body: lista } = await con(
        request(app.getHttpServer()).get('/imagenes'),
      ).expect(200);

      const { body } = await borrar(lista.datos[0]._id).expect(409);

      expect(body.codigo).toBe('IMAGEN_EN_USO');
      expect(cloudinaryFalso.borrar).not.toHaveBeenCalled();
    });

    it('[E] una imagen usada como foto de perfil responde IMAGEN_EN_USO', async () => {
      const sesion = await registrarYObtenerSesion(app, {
        correo: 'foto@correo.com',
        nombreUsuario: 'foto_c',
      });
      const { body: creada } = await subir(
        PNG,
        'image/png',
        sesion.token,
      ).expect(201);
      await usuarios.updateOne(
        { _id: sesion.usuario._id },
        { imagenPerfil: creada.url },
      );

      const { body } = await borrar(creada._id, sesion.token).expect(409);

      expect(body.codigo).toBe('IMAGEN_EN_USO');
    });

    it('[E] si Cloudinary falla responde 500 y el documento queda', async () => {
      const { body: creada } = await subir().expect(201);
      cloudinaryFalso.borrar.mockRejectedValueOnce(new Error('caído'));

      await borrar(creada._id).expect(500);

      await obtener(creada._id).expect(200);
    });

    it('[E] sin token responde TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .delete('/imagenes/64b7f0f0f0f0f0f0f0f0f0f0')
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
    });
  });
});
