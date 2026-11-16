import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { limpiarBase } from './app.js';
import { registrarOtraPersona, registrarYObtenerSesion } from './datos.js';
import { sembrarPublicaciones } from './publicaciones.js';

export const con = (app: INestApplication, token: string) => ({
  get: (ruta: string) =>
    request(app.getHttpServer())
      .get(ruta)
      .set('Authorization', `Bearer ${token}`),
  post: (ruta: string, cuerpo?: object) =>
    request(app.getHttpServer())
      .post(ruta)
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo),
  delete: (ruta: string) =>
    request(app.getHttpServer())
      .delete(ruta)
      .set('Authorization', `Bearer ${token}`),
});

export const comentarDesde = (
  app: INestApplication,
  token: string,
  publicacionId: string,
  mensaje = 'Qué rico',
) =>
  con(app, token)
    .post(`/publicaciones/${publicacionId}/comentarios`, { mensaje })
    .expect(201);

export const darMeGustaDesde = (
  app: INestApplication,
  token: string,
  publicacionId: string,
) =>
  con(app, token).post(`/publicaciones/${publicacionId}/megusta`).expect(201);

export async function prepararEscenario(app: INestApplication) {
  await limpiarBase(app);
  const autoria = await registrarYObtenerSesion(app);
  const otra = await registrarOtraPersona(app);
  const [publicacion] = await sembrarPublicaciones(app, autoria.usuario._id, 1);
  return { autoria, otra, publicacionId: String(publicacion._id) };
}
