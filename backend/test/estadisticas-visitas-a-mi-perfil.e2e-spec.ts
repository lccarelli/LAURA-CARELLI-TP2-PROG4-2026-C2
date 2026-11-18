import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Visita } from '../src/usuarios/schemas/visita.schema.js';
import { prepararEstadisticas } from './ayudas/estadisticas.js';
import { hoyEnBuenosAires, probarRangoYPermisos } from './ayudas/rango.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('GET /estadisticas/visitas-a-mi-perfil', () => {
  const contexto = prepararEstadisticas(
    '/estadisticas/visitas-a-mi-perfil',
    'desde=2026-03-10&hasta=2026-03-12',
  );
  const { consultar } = contexto;
  let visitas: Model<Visita>;

  const visitar = (visitante: string, visitado: string, fecha: string) =>
    visitas.create({ visitante, visitado, fecha: new Date(fecha) });

  beforeAll(async () => {
    visitas = contexto.app.get(getModelToken(Visita.name));
  });

  it('[O] cuenta las visitas a mi perfil de cada día del rango', async () => {
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-10T15:00:00Z');
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-10T16:00:00Z');
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-12T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 2 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 1 },
    ]);
  });

  it('[S] cuenta las visitas a cualquier perfil, no sólo al de quien consulta', async () => {
    await visitar(contexto.lauraId, contexto.juanId, '2026-03-10T15:00:00Z');
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-11T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { cantidad: number }) => dia.cantidad)).toEqual([
      1, 1, 0,
    ]);
  });

  it('[S] el resultado no depende de quién administra: otra persona con perfil administrador ve lo mismo', async () => {
    await visitar(contexto.lauraId, contexto.juanId, '2026-03-10T15:00:00Z');

    const { body } = await consultar(
      undefined,
      tokenDeAdministrador(contexto.juanId),
    ).expect(200);

    expect(body[0]).toEqual({ fecha: '2026-03-10', cantidad: 1 });
  });

  it('[S] las visitas de una persona a su propio perfil no cuentan', async () => {
    await visitar(contexto.lauraId, contexto.lauraId, '2026-03-10T15:00:00Z');
    await visitar(contexto.juanId, contexto.juanId, '2026-03-10T16:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(0);
  });

  it('[S] el flujo real: abrir el perfil de otra persona suma una visita', async () => {
    const hoy = hoyEnBuenosAires();
    const { body: sesion } = await request(contexto.app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador: 'juan_p', clave: 'Clave1234' })
      .expect(200);
    await request(contexto.app.getHttpServer())
      .post(`/usuarios/${contexto.lauraId}/visitas`)
      .set('Authorization', `Bearer ${sesion.token}`)
      .expect(201);

    const { body } = await consultar(`desde=${hoy}&hasta=${hoy}`).expect(200);

    expect(body).toEqual([{ fecha: hoy, cantidad: 1 }]);
  });

  it('[O] devuelve los días en orden cronológico', async () => {
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-12T15:00:00Z');
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-10T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { fecha: string }) => dia.fecha)).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
    ]);
  });

  it('[Z] sin visitas devuelve todos los días con cero', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 0 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 0 },
    ]);
  });

  it('[B] una visita de las 22:00 de Buenos Aires cuenta en ese día aunque en UTC sea el siguiente', async () => {
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-11T01:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { cantidad: number }) => dia.cantidad)).toEqual([
      1, 0, 0,
    ]);
  });

  it('[B] fuera del rango no entra: un segundo antes de desde y el instante después de hasta', async () => {
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-10T02:59:59Z');
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-13T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.every((dia: { cantidad: number }) => dia.cantidad === 0)).toBe(
      true,
    );
  });

  it('[B] desde igual a hasta devuelve un solo día', async () => {
    await visitar(contexto.juanId, contexto.lauraId, '2026-03-10T15:00:00Z');

    const { body } = await consultar(
      'desde=2026-03-10&hasta=2026-03-10',
    ).expect(200);

    expect(body).toEqual([{ fecha: '2026-03-10', cantidad: 1 }]);
  });

  it('[B] un rango de 366 días devuelve 366 filas', async () => {
    const { body } = await consultar(
      'desde=2025-03-01&hasta=2026-03-01',
    ).expect(200);

    expect(body).toHaveLength(366);
  });

  probarRangoYPermisos('/estadisticas/visitas-a-mi-perfil', () => contexto);
});
