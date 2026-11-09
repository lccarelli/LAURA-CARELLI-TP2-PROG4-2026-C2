import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

describe('GET /publicaciones/:id', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;

  const obtener = (id: string, tokenUsado: string | undefined = token) => {
    const solicitud = request(app.getHttpServer()).get(`/publicaciones/${id}`);
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };

  beforeAll(async () => {
    app = await crearApp();
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

  it('[O] devuelve la publicación con los datos de su autor', async () => {
    const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

    const { body } = await obtener(creada.id).expect(200);

    expect(body).toMatchObject({
      _id: creada.id,
      titulo: 'Título 1',
      mensaje: 'Mensaje 1',
    });
    expect(body.usuario._id).toBe(usuarioId);
    expect(body.usuario.nombreUsuario).toBeDefined();
    expect(body.usuario.clave).toBeUndefined();
    expect(body.usuario.correo).toBeUndefined();
  });

  it('[E] un id con formato válido que no existe responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
    const { body } = await obtener('64b64b64b64b64b64b64b64b').expect(404);

    expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
  });

  it('[E] un id que no tiene formato de ObjectId, o con operadores, responde 400', async () => {
    for (const id of [
      'abc',
      '123',
      '{"$ne":null}',
      "' OR '1'='1",
      '64b64b64b64b64b64b64b64',
    ]) {
      const { body } = await obtener(encodeURIComponent(id)).expect(400);
      expect(body.codigo, id).toBe('DATOS_INVALIDOS');
    }
  });

  it('[E] sin sesión responde 401', async () => {
    await obtener('64b64b64b64b64b64b64b64b', '').expect(401);
  });

  it('[E] una publicación dada de baja responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
    const [creada] = await sembrarPublicaciones(app, usuarioId, 1);
    await request(app.getHttpServer())
      .delete(`/publicaciones/${creada.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const { body } = await obtener(creada.id).expect(404);

    expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
  });

  it('[I] trae meGusta en falso mientras no se dio me gusta', async () => {
    const [creada] = await sembrarPublicaciones(app, usuarioId, 1);

    const { body } = await obtener(creada.id).expect(200);

    expect(body.meGusta).toBe(false);
  });
});
