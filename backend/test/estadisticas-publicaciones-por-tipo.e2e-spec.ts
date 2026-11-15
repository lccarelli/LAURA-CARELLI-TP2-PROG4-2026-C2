import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { probarRangoYPermisos } from './ayudas/rango.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';

describe('GET /estadisticas/publicaciones-por-tipo', () => {
  let app: INestApplication;
  let modelo: Model<Publicacion>;
  let tokenAdministrador: string;
  let tokenComun: string;
  let lauraId: string;

  const consultar = (
    consulta = 'desde=2026-03-01&hasta=2026-03-31',
    token = tokenAdministrador,
  ) =>
    request(app.getHttpServer())
      .get(`/estadisticas/publicaciones-por-tipo?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const publicar = (
    tipo: string,
    fecha = '2026-03-10T15:00:00Z',
    activa = true,
  ) =>
    modelo.create({
      usuario: lauraId,
      tipo,
      titulo: 'Título',
      mensaje: 'Mensaje',
      fecha: new Date(fecha),
      activa,
    });

  beforeAll(async () => {
    app = await crearApp();
    modelo = app.get(getModelToken(Publicacion.name));
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

  it('[O] cuenta las publicaciones de cada tipo, siempre en el orden receta, tip, experiencia', async () => {
    await publicar('experiencia');
    await publicar('receta');
    await publicar('receta');
    await publicar('tip');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { tipo: 'receta', cantidad: 2 },
      { tipo: 'tip', cantidad: 1 },
      { tipo: 'experiencia', cantidad: 1 },
    ]);
  });

  it('[Z] sin publicaciones devuelve los tres tipos en cero', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { tipo: 'receta', cantidad: 0 },
      { tipo: 'tip', cantidad: 0 },
      { tipo: 'experiencia', cantidad: 0 },
    ]);
  });

  it('[O] un tipo sin publicaciones aparece con cero', async () => {
    await publicar('receta');

    const { body } = await consultar().expect(200);

    expect(body[1]).toEqual({ tipo: 'tip', cantidad: 0 });
  });

  it('[O] solo cuenta las publicaciones activas', async () => {
    await publicar('receta');
    await publicar('receta', '2026-03-11T15:00:00Z', false);

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(1);
  });

  it('[O] solo cuenta las publicaciones del rango', async () => {
    await publicar('receta');
    await publicar('receta', '2026-02-10T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(1);
  });

  it('[B] los bordes del rango se interpretan en la hora de Buenos Aires', async () => {
    await publicar('receta', '2026-03-01T03:00:00Z');
    await publicar('receta', '2026-03-01T02:59:59Z');
    await publicar('receta', '2026-04-01T02:59:59Z');
    await publicar('receta', '2026-04-01T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(2);
  });

  probarRangoYPermisos('/estadisticas/publicaciones-por-tipo', () => ({
    app,
    tokenComun,
    consultar,
  }));
});
