import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';
import { probarRangoYPermisos } from './ayudas/rango.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';

describe('GET /estadisticas/publicaciones-por-usuario', () => {
  let app: INestApplication;
  let modelo: Model<Publicacion>;
  let tokenAdministrador: string;
  let tokenComun: string;
  let lauraId: string;
  let juanId: string;

  const consultar = (
    consulta = 'desde=2026-03-01&hasta=2026-03-31',
    token = tokenAdministrador,
  ) =>
    request(app.getHttpServer())
      .get(`/estadisticas/publicaciones-por-usuario?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const publicar = (usuario: string, fecha: string, activa = true) =>
    modelo.create({
      usuario,
      tipo: 'experiencia',
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
    const juan = await registrarOtraPersona(app);
    tokenComun = laura.token;
    tokenAdministrador = tokenDeAdministrador(laura.usuario._id);
    lauraId = laura.usuario._id;
    juanId = juan.usuario._id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] cuenta las publicaciones de cada persona dentro del rango', async () => {
    await publicar(lauraId, '2026-03-10T15:00:00Z');
    await publicar(lauraId, '2026-03-11T15:00:00Z');
    await publicar(juanId, '2026-03-12T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: lauraId, nombreUsuario: 'laura_c', cantidad: 2 },
      { usuario: juanId, nombreUsuario: 'juan_p', cantidad: 1 },
    ]);
  });

  it('[O] ordena de más a menos publicaciones y, si empatan, por nombre de usuario', async () => {
    await publicar(juanId, '2026-03-10T15:00:00Z');
    await publicar(lauraId, '2026-03-10T15:00:00Z');
    await publicar(juanId, '2026-03-11T15:00:00Z');
    await publicar(lauraId, '2026-03-11T15:00:00Z');
    await publicar(lauraId, '2026-03-12T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(
      body.map((fila: { nombreUsuario: string }) => fila.nombreUsuario),
    ).toEqual(['laura_c', 'juan_p']);
  });

  it('[O] solo cuenta publicaciones activas', async () => {
    await publicar(lauraId, '2026-03-10T15:00:00Z');
    await publicar(lauraId, '2026-03-11T15:00:00Z', false);

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].cantidad).toBe(1);
  });

  it('[Z] sin publicaciones en el rango devuelve una lista vacía', async () => {
    await publicar(lauraId, '2026-02-10T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([]);
  });

  it('[Z] sin ninguna publicación devuelve una lista vacía', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual([]);
  });

  it('[B] el primer instante del día desde en Buenos Aires entra y un segundo antes no', async () => {
    await publicar(lauraId, '2026-03-01T03:00:00Z');
    await publicar(juanId, '2026-03-01T02:59:59Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: lauraId, nombreUsuario: 'laura_c', cantidad: 1 },
    ]);
  });

  it('[B] el último segundo del día hasta en Buenos Aires entra y el siguiente no', async () => {
    await publicar(lauraId, '2026-04-01T02:59:59Z');
    await publicar(juanId, '2026-04-01T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: lauraId, nombreUsuario: 'laura_c', cantidad: 1 },
    ]);
  });

  it('[B] una publicación de las 22:00 de Buenos Aires cuenta en ese día aunque en UTC sea el siguiente', async () => {
    await publicar(lauraId, '2026-03-16T01:00:00Z');

    const { body } = await consultar(
      'desde=2026-03-15&hasta=2026-03-15',
    ).expect(200);

    expect(body).toHaveLength(1);
  });

  it('[B] desde igual a hasta es un rango de un solo día', async () => {
    await publicar(lauraId, '2026-03-10T15:00:00Z');
    await publicar(juanId, '2026-03-11T15:00:00Z');

    const { body } = await consultar(
      'desde=2026-03-10&hasta=2026-03-10',
    ).expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].nombreUsuario).toBe('laura_c');
  });

  probarRangoYPermisos('/estadisticas/publicaciones-por-usuario', () => ({
    app,
    tokenComun,
    consultar,
  }));
});
