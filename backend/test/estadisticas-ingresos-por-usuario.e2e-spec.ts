import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Ingreso } from '../src/auth/schemas/ingreso.schema.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';
import { hoyEnBuenosAires, probarRangoYPermisos } from './ayudas/rango.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('GET /estadisticas/ingresos-por-usuario', () => {
  let app: INestApplication;
  let ingresos: Model<Ingreso>;
  let usuarios: Model<Usuario>;
  let tokenAdministrador: string;
  let tokenComun: string;
  let lauraId: string;
  let juanId: string;

  const consultar = (
    consulta = 'desde=2026-03-01&hasta=2026-03-31',
    token = tokenAdministrador,
  ) =>
    request(app.getHttpServer())
      .get(`/estadisticas/ingresos-por-usuario?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const ingresar = (usuario: string, fecha: string) =>
    ingresos.create({ usuario, fecha: new Date(fecha) });

  beforeAll(async () => {
    app = await crearApp();
    ingresos = app.get(getModelToken(Ingreso.name));
    usuarios = app.get(getModelToken(Usuario.name));
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

  it('[O] cuenta los ingresos de cada persona y ordena de más a menos', async () => {
    await ingresar(lauraId, '2026-03-05T15:00:00Z');
    await ingresar(juanId, '2026-03-05T16:00:00Z');
    await ingresar(juanId, '2026-03-06T16:00:00Z');
    await ingresar(juanId, '2026-03-07T16:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: juanId, nombreUsuario: 'juan_p', cantidad: 3 },
      { usuario: lauraId, nombreUsuario: 'laura_c', cantidad: 1 },
    ]);
  });

  it('[O] si empatan, ordena por nombre de usuario', async () => {
    await ingresar(juanId, '2026-03-05T15:00:00Z');
    await ingresar(lauraId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(
      body.map((fila: { nombreUsuario: string }) => fila.nombreUsuario),
    ).toEqual(['juan_p', 'laura_c']);
  });

  it('[O] sólo aparecen las personas que ingresaron: quien no ingresó en el rango no figura con cero', async () => {
    await ingresar(lauraId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].nombreUsuario).toBe('laura_c');
  });

  it('[O] sólo cuenta los ingresos del rango', async () => {
    await ingresar(lauraId, '2026-02-28T15:00:00Z');
    await ingresar(lauraId, '2026-03-10T15:00:00Z');
    await ingresar(lauraId, '2026-04-02T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: lauraId, nombreUsuario: 'laura_c', cantidad: 1 },
    ]);
  });

  it('[O] una persona deshabilitada sigue figurando: sus ingresos pasados ocurrieron', async () => {
    await ingresar(juanId, '2026-03-05T15:00:00Z');
    await usuarios.updateOne({ _id: juanId }, { habilitado: false });

    const { body } = await consultar().expect(200);

    expect(body[0].nombreUsuario).toBe('juan_p');
  });

  it('[O] ignora los ingresos de personas que ya no existen', async () => {
    await ingresar(lauraId, '2026-03-05T15:00:00Z');
    await usuarios.deleteOne({ _id: juanId });
    await ingresar(juanId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(1);
  });

  it('[S] los ingresos reales cuentan: ingresar con clave suma uno', async () => {
    await limpiarBase(app);
    await registrarYObtenerSesion(app);
    await request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador: 'laura_c', clave: 'Clave1234' })
      .expect(200);
    const hoy = hoyEnBuenosAires();
    const admin = tokenDeAdministrador(
      (await usuarios.findOne().lean())!._id.toString(),
    );

    const { body } = await request(app.getHttpServer())
      .get(`/estadisticas/ingresos-por-usuario?desde=${hoy}&hasta=${hoy}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);

    expect(body[0].cantidad).toBe(1);
  });

  it('[Z] sin ingresos devuelve la lista vacía', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual([]);
  });

  it('[B] los bordes del rango se interpretan en la hora de Buenos Aires', async () => {
    await ingresar(lauraId, '2026-03-01T02:59:59Z');
    await ingresar(lauraId, '2026-03-01T03:00:00Z');
    await ingresar(lauraId, '2026-04-01T02:59:59Z');
    await ingresar(lauraId, '2026-04-01T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(2);
  });

  it('[I] no devuelve datos privados de las personas: sólo id, usuario y cantidad', async () => {
    await ingresar(lauraId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(Object.keys(body[0]).sort((a, b) => a.localeCompare(b))).toEqual([
      'cantidad',
      'nombreUsuario',
      'usuario',
    ]);
  });

  probarRangoYPermisos('/estadisticas/ingresos-por-usuario', () => ({
    app,
    tokenComun,
    consultar,
  }));
});
