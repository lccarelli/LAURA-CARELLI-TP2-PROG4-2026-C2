import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Ingreso } from '../src/auth/schemas/ingreso.schema.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { limpiarBase } from './ayudas/app.js';
import { ingresarConClave, registrarYObtenerSesion } from './ayudas/datos.js';
import { prepararEstadisticas } from './ayudas/estadisticas.js';
import { hoyEnBuenosAires, probarRangoYPermisos } from './ayudas/rango.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('GET /estadisticas/ingresos-por-usuario', () => {
  const contexto = prepararEstadisticas(
    '/estadisticas/ingresos-por-usuario',
    'desde=2026-03-01&hasta=2026-03-31',
  );
  const { consultar } = contexto;
  let ingresos: Model<Ingreso>;
  let usuarios: Model<Usuario>;

  const ingresar = (usuario: string, fecha: string) =>
    ingresos.create({ usuario, fecha: new Date(fecha) });

  beforeAll(async () => {
    ingresos = contexto.app.get(getModelToken(Ingreso.name));
    usuarios = contexto.app.get(getModelToken(Usuario.name));
  });

  it('[O] cuenta los ingresos de cada persona y ordena de más a menos', async () => {
    await ingresar(contexto.lauraId, '2026-03-05T15:00:00Z');
    await ingresar(contexto.juanId, '2026-03-05T16:00:00Z');
    await ingresar(contexto.juanId, '2026-03-06T16:00:00Z');
    await ingresar(contexto.juanId, '2026-03-07T16:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: contexto.juanId, nombreUsuario: 'juan_p', cantidad: 3 },
      { usuario: contexto.lauraId, nombreUsuario: 'laura_c', cantidad: 1 },
    ]);
  });

  it('[O] si empatan, ordena por nombre de usuario', async () => {
    await ingresar(contexto.juanId, '2026-03-05T15:00:00Z');
    await ingresar(contexto.lauraId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(
      body.map((fila: { nombreUsuario: string }) => fila.nombreUsuario),
    ).toEqual(['juan_p', 'laura_c']);
  });

  it('[O] sólo aparecen las personas que ingresaron: quien no ingresó en el rango no figura con cero', async () => {
    await ingresar(contexto.lauraId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].nombreUsuario).toBe('laura_c');
  });

  it('[O] sólo cuenta los ingresos del rango', async () => {
    await ingresar(contexto.lauraId, '2026-02-28T15:00:00Z');
    await ingresar(contexto.lauraId, '2026-03-10T15:00:00Z');
    await ingresar(contexto.lauraId, '2026-04-02T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { usuario: contexto.lauraId, nombreUsuario: 'laura_c', cantidad: 1 },
    ]);
  });

  it('[O] una persona deshabilitada sigue figurando: sus ingresos pasados ocurrieron', async () => {
    await ingresar(contexto.juanId, '2026-03-05T15:00:00Z');
    await usuarios.updateOne({ _id: contexto.juanId }, { habilitado: false });

    const { body } = await consultar().expect(200);

    expect(body[0].nombreUsuario).toBe('juan_p');
  });

  it('[O] ignora los ingresos de personas que ya no existen', async () => {
    await ingresar(contexto.lauraId, '2026-03-05T15:00:00Z');
    await usuarios.deleteOne({ _id: contexto.juanId });
    await ingresar(contexto.juanId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toHaveLength(1);
  });

  it('[S] los ingresos reales cuentan: ingresar con clave suma uno', async () => {
    await limpiarBase(contexto.app);
    await registrarYObtenerSesion(contexto.app);
    await ingresarConClave(contexto.app, 'laura_c');
    const hoy = hoyEnBuenosAires();
    const admin = tokenDeAdministrador(
      (await usuarios.findOne().lean())!._id.toString(),
    );

    const { body } = await request(contexto.app.getHttpServer())
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
    await ingresar(contexto.lauraId, '2026-03-01T02:59:59Z');
    await ingresar(contexto.lauraId, '2026-03-01T03:00:00Z');
    await ingresar(contexto.lauraId, '2026-04-01T02:59:59Z');
    await ingresar(contexto.lauraId, '2026-04-01T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(2);
  });

  it('[I] no devuelve datos privados de las personas: sólo id, usuario y cantidad', async () => {
    await ingresar(contexto.lauraId, '2026-03-05T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(Object.keys(body[0]).sort((a, b) => a.localeCompare(b))).toEqual([
      'cantidad',
      'nombreUsuario',
      'usuario',
    ]);
  });

  probarRangoYPermisos('/estadisticas/ingresos-por-usuario', () => contexto);
});
