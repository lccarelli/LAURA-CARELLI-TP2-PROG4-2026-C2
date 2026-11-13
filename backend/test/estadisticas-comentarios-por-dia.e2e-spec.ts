import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';
import { Comentario } from '../src/publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';

describe('GET /estadisticas/comentarios-por-dia', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let comentarios: Model<Comentario>;
  let tokenAdministrador: string;
  let tokenComun: string;
  let lauraId: string;
  let publicacionId: string;

  const consultar = (
    consulta = 'desde=2026-03-10&hasta=2026-03-12',
    token = tokenAdministrador,
  ) =>
    request(app.getHttpServer())
      .get(`/estadisticas/comentarios-por-dia?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const comentar = (fecha: string, publicacion: string = publicacionId) =>
    comentarios.create({
      publicacion,
      usuario: lauraId,
      mensaje: 'Mensaje',
      fecha: new Date(fecha),
    });

  const publicar = (activa = true) =>
    publicaciones.create({
      usuario: lauraId,
      tipo: 'experiencia',
      titulo: 'Título',
      mensaje: 'Mensaje',
      activa,
    });

  beforeAll(async () => {
    app = await crearApp();
    publicaciones = app.get(getModelToken(Publicacion.name));
    comentarios = app.get(getModelToken(Comentario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const laura = await registrarYObtenerSesion(app);
    tokenComun = laura.token;
    tokenAdministrador = tokenDeAdministrador(laura.usuario._id);
    lauraId = laura.usuario._id;
    publicacionId = String((await publicar())._id);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] cuenta los comentarios de cada día del rango', async () => {
    await comentar('2026-03-10T15:00:00Z');
    await comentar('2026-03-10T16:00:00Z');
    await comentar('2026-03-12T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 2 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 1 },
    ]);
  });

  it('[O] suma los comentarios de todas las publicaciones', async () => {
    const otra = String((await publicar())._id);
    await comentar('2026-03-10T15:00:00Z');
    await comentar('2026-03-10T15:00:00Z', otra);

    const { body } = await consultar().expect(200);

    expect(body[0]).toEqual({ fecha: '2026-03-10', cantidad: 2 });
  });

  it('[O] no cuenta los comentarios de publicaciones dadas de baja', async () => {
    const dada = String((await publicar(false))._id);
    await comentar('2026-03-10T15:00:00Z');
    await comentar('2026-03-10T15:00:00Z', dada);

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(1);
  });

  it('[O] no cuenta comentarios de publicaciones que ya no existen', async () => {
    await comentar('2026-03-10T15:00:00Z', String(new Types.ObjectId()));

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(0);
  });

  it('[O] devuelve los días en orden cronológico', async () => {
    await comentar('2026-03-12T15:00:00Z');
    await comentar('2026-03-10T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { fecha: string }) => dia.fecha)).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
    ]);
  });

  it('[Z] sin comentarios devuelve todos los días con cero', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 0 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 0 },
    ]);
  });

  it('[B] un comentario de las 22:00 de Buenos Aires cuenta en ese día aunque en UTC sea el siguiente', async () => {
    await comentar('2026-03-11T01:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 1 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 0 },
    ]);
  });

  it.each([
    ['02:59:59Z del día siguiente', '2026-03-11T02:59:59Z', '2026-03-10'],
    ['03:00:00Z del día siguiente', '2026-03-11T03:00:00Z', '2026-03-11'],
  ])(
    '[B] el cambio de día en Buenos Aires: %s',
    async (_caso, instante, dia) => {
      await comentar(instante);

      const { body } = await consultar().expect(200);

      expect(
        body.find((fila: { fecha: string }) => fila.fecha === dia).cantidad,
      ).toBe(1);
    },
  );

  it('[B] fuera del rango no entra: un segundo antes de desde y el instante después de hasta', async () => {
    await comentar('2026-03-10T02:59:59Z');
    await comentar('2026-03-13T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(
      body.reduce(
        (total: number, dia: { cantidad: number }) => total + dia.cantidad,
        0,
      ),
    ).toBe(0);
  });

  it('[B] desde igual a hasta devuelve un solo día', async () => {
    await comentar('2026-03-10T15:00:00Z');

    const { body } = await consultar(
      'desde=2026-03-10&hasta=2026-03-10',
    ).expect(200);

    expect(body).toEqual([{ fecha: '2026-03-10', cantidad: 1 }]);
  });

  it('[B] un rango de 366 días devuelve 366 filas y uno de 367 se rechaza', async () => {
    const { body } = await consultar(
      'desde=2025-03-01&hasta=2026-03-01',
    ).expect(200);
    expect(body).toHaveLength(366);

    const rechazo = await consultar('desde=2025-02-28&hasta=2026-03-01').expect(
      400,
    );
    expect(rechazo.body.codigo).toBe('RANGO_DEMASIADO_LARGO');
  });

  it('[E] desde posterior a hasta responde 400 RANGO_INVALIDO', async () => {
    const { body } = await consultar(
      'desde=2026-03-31&hasta=2026-03-01',
    ).expect(400);

    expect(body.codigo).toBe('RANGO_INVALIDO');
  });

  it.each([
    ['sin parámetros', ''],
    ['sin hasta', 'desde=2026-03-01'],
    ['fecha inexistente', 'desde=2026-02-30&hasta=2026-03-31'],
    ['parámetro de más', 'desde=2026-03-01&hasta=2026-03-31&usuario=1'],
  ])('[E] %s responde 400 DATOS_INVALIDOS', async (_caso, consulta) => {
    const { body } = await consultar(consulta).expect(400);

    expect(body.codigo).toBe('DATOS_INVALIDOS');
  });

  it('[S] una persona común recibe 403 NO_ES_ADMINISTRADOR', async () => {
    const { body } = await consultar(undefined, tokenComun).expect(403);

    expect(body.codigo).toBe('NO_ES_ADMINISTRADOR');
  });

  it('[S] sin token responde 401 TOKEN_AUSENTE', async () => {
    const { body } = await request(app.getHttpServer())
      .get(
        '/estadisticas/comentarios-por-dia?desde=2026-03-10&hasta=2026-03-12',
      )
      .expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });
});
