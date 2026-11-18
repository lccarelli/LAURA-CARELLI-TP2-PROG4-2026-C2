import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventoMeGusta } from '../src/publicaciones/schemas/evento-me-gusta.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { ingresarConClave, postConToken } from './ayudas/datos.js';
import { prepararEstadisticas } from './ayudas/estadisticas.js';
import { hoyEnBuenosAires, probarRangoYPermisos } from './ayudas/rango.js';

describe('GET /estadisticas/megusta-por-dia', () => {
  const contexto = prepararEstadisticas(
    '/estadisticas/megusta-por-dia',
    'desde=2026-03-10&hasta=2026-03-12',
  );
  const { consultar } = contexto;
  let publicaciones: Model<Publicacion>;
  let eventos: Model<EventoMeGusta>;
  let publicacionId: string;

  const publicar = (activa = true) =>
    publicaciones.create({
      usuario: contexto.lauraId,
      tipo: 'experiencia',
      titulo: 'Título',
      mensaje: 'Mensaje',
      activa,
    });

  const evento = (
    fecha: string,
    tipo: 'dado' | 'quitado' = 'dado',
    publicacion: string = publicacionId,
  ) =>
    eventos.create({
      tipo,
      usuario: contexto.juanId,
      nombreUsuario: 'juan_p',
      publicacion,
      tituloPublicacion: 'Título',
      autor: contexto.lauraId,
      nombreAutor: 'laura_c',
      cantidadMeGusta: 1,
      fecha: new Date(fecha),
    });

  beforeAll(async () => {
    publicaciones = contexto.app.get(getModelToken(Publicacion.name));
    eventos = contexto.app.get(getModelToken(EventoMeGusta.name));
  });

  beforeEach(async () => {
    publicacionId = String((await publicar())._id);
  });

  it('[O] cuenta los me gusta otorgados de cada día del rango', async () => {
    await evento('2026-03-10T15:00:00Z');
    await evento('2026-03-10T16:00:00Z');
    await evento('2026-03-12T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 2 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 1 },
    ]);
  });

  it('[O] suma los me gusta de todas las publicaciones', async () => {
    const otra = String((await publicar())._id);
    await evento('2026-03-10T15:00:00Z');
    await evento('2026-03-10T16:00:00Z', 'dado', otra);

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(2);
  });

  it('[S] sólo cuenta los otorgados: quitar un me gusta no suma ni resta', async () => {
    await evento('2026-03-10T15:00:00Z', 'dado');
    await evento('2026-03-10T16:00:00Z', 'quitado');

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(1);
  });

  it('[S] un me gusta dado y quitado después sigue contando como otorgado ese día', async () => {
    await evento('2026-03-10T15:00:00Z', 'dado');
    await evento('2026-03-11T15:00:00Z', 'quitado');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { cantidad: number }) => dia.cantidad)).toEqual([
      1, 0, 0,
    ]);
  });

  it('[O] no cuenta los me gusta de publicaciones dadas de baja', async () => {
    const baja = String((await publicar(false))._id);
    await evento('2026-03-10T15:00:00Z', 'dado', baja);

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(0);
  });

  it('[O] no cuenta los me gusta de publicaciones que ya no existen', async () => {
    await evento('2026-03-10T15:00:00Z', 'dado', String(new Types.ObjectId()));

    const { body } = await consultar().expect(200);

    expect(body[0].cantidad).toBe(0);
  });

  it('[S] el flujo real: dar me gusta desde la aplicación suma uno en el día de hoy', async () => {
    const hoy = hoyEnBuenosAires();
    const { token } = await ingresarConClave(contexto.app, 'juan_p');
    await postConToken(
      contexto.app,
      `/publicaciones/${publicacionId}/megusta`,
      token,
    ).expect(201);

    const { body } = await consultar(`desde=${hoy}&hasta=${hoy}`).expect(200);

    expect(body).toEqual([{ fecha: hoy, cantidad: 1 }]);
  });

  it('[O] devuelve los días en orden cronológico', async () => {
    await evento('2026-03-12T15:00:00Z');
    await evento('2026-03-10T15:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { fecha: string }) => dia.fecha)).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
    ]);
  });

  it('[Z] sin me gusta devuelve todos los días con cero', async () => {
    const { body } = await consultar().expect(200);

    expect(body).toEqual([
      { fecha: '2026-03-10', cantidad: 0 },
      { fecha: '2026-03-11', cantidad: 0 },
      { fecha: '2026-03-12', cantidad: 0 },
    ]);
  });

  it('[B] un me gusta de las 22:00 de Buenos Aires cuenta en ese día aunque en UTC sea el siguiente', async () => {
    await evento('2026-03-11T01:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.map((dia: { cantidad: number }) => dia.cantidad)).toEqual([
      1, 0, 0,
    ]);
  });

  it('[B] fuera del rango no entra: un segundo antes de desde y el instante después de hasta', async () => {
    await evento('2026-03-10T02:59:59Z');
    await evento('2026-03-13T03:00:00Z');

    const { body } = await consultar().expect(200);

    expect(body.every((dia: { cantidad: number }) => dia.cantidad === 0)).toBe(
      true,
    );
  });

  it('[B] desde igual a hasta devuelve un solo día', async () => {
    await evento('2026-03-10T15:00:00Z');

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

  probarRangoYPermisos('/estadisticas/megusta-por-dia', () => contexto);
});
