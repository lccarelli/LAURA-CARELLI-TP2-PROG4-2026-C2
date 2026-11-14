import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { probarRangoYPermisos } from './ayudas/rango.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';
import { Comentario } from '../src/publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';

describe('GET /estadisticas/comentarios-por-publicacion', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let comentarios: Model<Comentario>;
  let tokenAdministrador: string;
  let tokenComun: string;
  let lauraId: string;

  const consultar = (
    consulta = 'desde=2026-03-01&hasta=2026-03-31',
    token = tokenAdministrador,
  ) =>
    request(app.getHttpServer())
      .get(`/estadisticas/comentarios-por-publicacion?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const publicar = async (titulo: string, activa = true) =>
    String(
      (
        await publicaciones.create({
          usuario: lauraId,
          tipo: 'experiencia',
          titulo,
          mensaje: 'Mensaje',
          activa,
        })
      )._id,
    );

  const comentar = async (
    publicacion: string,
    cantidad: number,
    fecha = '2026-03-10T15:00:00Z',
  ) => {
    for (let numero = 0; numero < cantidad; numero++) {
      await comentarios.create({
        publicacion,
        usuario: lauraId,
        mensaje: 'Mensaje',
        fecha: new Date(fecha),
      });
    }
  };

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] cuenta los comentarios de cada publicación y ordena de más a menos', async () => {
    const tarta = await publicar('Tarta');
    const pizza = await publicar('Pizza');
    await comentar(tarta, 1);
    await comentar(pizza, 3);

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { publicacion: pizza, titulo: 'Pizza', cantidad: 3 },
      { publicacion: tarta, titulo: 'Tarta', cantidad: 1 },
    ]);
  });

  it('[O] si empatan, ordena por título', async () => {
    const tarta = await publicar('Tarta');
    const asado = await publicar('Asado');
    await comentar(tarta, 2);
    await comentar(asado, 2);

    const { body } = await consultar().expect(200);

    expect(body.map((fila: { titulo: string }) => fila.titulo)).toEqual([
      'Asado',
      'Tarta',
    ]);
  });

  it('[B] devuelve como máximo las 10 publicaciones con más comentarios', async () => {
    for (let numero = 1; numero <= 11; numero++) {
      await comentar(await publicar(`Receta ${numero}`), numero);
    }

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(10);
    expect(body[0].cantidad).toBe(11);
    expect(body[9].cantidad).toBe(2);
  });

  it('[B] con exactamente 10 publicaciones devuelve las 10', async () => {
    for (let numero = 1; numero <= 10; numero++) {
      await comentar(await publicar(`Receta ${numero}`), 1);
    }

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(10);
  });

  it('[O] sólo cuenta los comentarios del rango', async () => {
    const tarta = await publicar('Tarta');
    await comentar(tarta, 2);
    await comentar(tarta, 5, '2026-02-10T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(2);
  });

  it('[O] no incluye publicaciones dadas de baja y las activas siguen apareciendo', async () => {
    const baja = await publicar('Baja', false);
    const activa = await publicar('Activa');
    await comentar(baja, 5);
    await comentar(activa, 1);

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { publicacion: activa, titulo: 'Activa', cantidad: 1 },
    ]);
  });

  it('[O] una publicación dada de baja no ocupa un lugar del ranking', async () => {
    const baja = await publicar('Baja', false);
    await comentar(baja, 20);
    for (let numero = 1; numero <= 10; numero++) {
      await comentar(await publicar(`Receta ${numero}`), 1);
    }

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(10);
    expect(
      body.some((fila: { titulo: string }) => fila.titulo === 'Baja'),
    ).toBe(false);
  });

  it('[O] ignora los comentarios de publicaciones que ya no existen', async () => {
    await comentar(String(new Types.ObjectId()), 3);

    const { body } = await consultar().expect(200);

    expect(body).toEqual([]);
  });

  it('[Z] sin comentarios en el rango devuelve una lista vacía', async () => {
    await publicar('Tarta');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([]);
  });

  it('[B] los bordes del rango se interpretan en la hora de Buenos Aires', async () => {
    const tarta = await publicar('Tarta');
    await comentar(tarta, 1, '2026-03-01T03:00:00Z');
    await comentar(tarta, 1, '2026-03-01T02:59:59Z');
    await comentar(tarta, 1, '2026-04-01T02:59:59Z');
    await comentar(tarta, 1, '2026-04-01T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(2);
  });

  probarRangoYPermisos('/estadisticas/comentarios-por-publicacion', () => ({
    app,
    tokenComun,
    consultar,
  }));
});
