import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';
import { probarRangoYPermisos } from './ayudas/rango.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';
import { Comentario } from '../src/publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';

describe('GET /estadisticas/resumen', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let comentarios: Model<Comentario>;
  let tokenAdministrador: string;
  let tokenComun: string;
  let lauraId: string;
  let juanId: string;

  const consultar = (
    consulta = 'desde=2026-03-08&hasta=2026-03-14',
    token = tokenAdministrador,
  ) =>
    request(app.getHttpServer())
      .get(`/estadisticas/resumen?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const publicar = (fecha: string, usuario = lauraId, activa = true) =>
    publicaciones.create({
      usuario,
      tipo: 'experiencia',
      titulo: 'Título',
      mensaje: 'Mensaje',
      fecha: new Date(fecha),
      activa,
    });

  const comentar = (
    fecha: string,
    publicacion: Types.ObjectId | string,
    usuario = lauraId,
  ) =>
    comentarios.create({
      publicacion,
      usuario,
      mensaje: 'Mensaje',
      fecha: new Date(fecha),
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
    juanId = (await registrarOtraPersona(app)).usuario._id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('[Z] sin actividad devuelve todo en cero y las fechas de los dos lapsos', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual({
      actual: {
        desde: '2026-03-08',
        hasta: '2026-03-14',
        publicaciones: 0,
        comentarios: 0,
        personasActivas: 0,
      },
      anterior: {
        desde: '2026-03-01',
        hasta: '2026-03-07',
        publicaciones: 0,
        comentarios: 0,
        personasActivas: 0,
      },
    });
  });

  it('[O] cuenta publicaciones, comentarios y personas activas del rango', async () => {
    const primera = await publicar('2026-03-09T15:00:00Z');
    await publicar('2026-03-10T15:00:00Z');
    await comentar('2026-03-11T15:00:00Z', primera._id, juanId);
    await comentar('2026-03-12T15:00:00Z', primera._id, juanId);

    const { body } = await consultar().expect(200);

    expect(body.actual).toMatchObject({
      publicaciones: 2,
      comentarios: 2,
      personasActivas: 2,
    });
  });

  it('[O] una persona que publica y comenta cuenta una sola vez', async () => {
    const publicacion = await publicar('2026-03-09T15:00:00Z');
    await comentar('2026-03-10T15:00:00Z', publicacion._id);

    const { body } = await consultar().expect(200);

    expect(body.actual.personasActivas).toBe(1);
  });

  it('[O] alguien que solo comenta también es una persona activa', async () => {
    const publicacion = await publicar('2026-03-09T15:00:00Z');
    await comentar('2026-03-10T15:00:00Z', publicacion._id, juanId);

    const { body } = await consultar().expect(200);

    expect(body.actual.personasActivas).toBe(2);
  });

  it('[O] separa lo del lapso anterior de lo del rango pedido', async () => {
    const vieja = await publicar('2026-03-03T15:00:00Z');
    await comentar('2026-03-04T15:00:00Z', vieja._id, juanId);
    await publicar('2026-03-09T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.actual).toMatchObject({
      publicaciones: 1,
      comentarios: 0,
      personasActivas: 1,
    });
    expect(body.anterior).toMatchObject({
      publicaciones: 1,
      comentarios: 1,
      personasActivas: 2,
    });
  });

  it('[O] no cuenta publicaciones dadas de baja ni sus comentarios ni a sus autores', async () => {
    const dada = await publicar('2026-03-09T15:00:00Z', juanId, false);
    await comentar('2026-03-10T15:00:00Z', dada._id, juanId);

    const { body } = await consultar().expect(200);

    expect(body.actual).toMatchObject({
      publicaciones: 0,
      comentarios: 0,
      personasActivas: 0,
    });
  });

  it('[O] no cuenta comentarios de publicaciones que ya no existen', async () => {
    await comentar('2026-03-10T15:00:00Z', new Types.ObjectId());

    const { body } = await consultar().expect(200);

    expect(body.actual.comentarios).toBe(0);
  });

  it('[B] los bordes del rango se interpretan en la hora de Buenos Aires', async () => {
    await publicar('2026-03-08T02:59:59Z');
    await publicar('2026-03-08T03:00:00Z');
    await publicar('2026-03-15T02:59:59Z');
    await publicar('2026-03-15T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.actual.publicaciones).toBe(2);
    expect(body.anterior.publicaciones).toBe(1);
  });

  probarRangoYPermisos('/estadisticas/resumen', () => ({
    app,
    tokenComun,
    consultar,
  }));
});
