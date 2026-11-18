import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp, limpiarBase } from './app.js';
import { registrarOtraPersona, registrarYObtenerSesion } from './datos.js';
import { tokenDeAdministrador } from './sesiones.js';

export interface ContextoDeEstadisticas {
  app: INestApplication;
  tokenAdministrador: string;
  tokenComun: string;
  lauraId: string;
  juanId: string;
  consultar: (consulta?: string, token?: string) => request.Test;
}

export function prepararEstadisticas(ruta: string, consultaPorDefecto: string) {
  const contexto = {} as ContextoDeEstadisticas;

  contexto.consultar = (
    consulta = consultaPorDefecto,
    token = contexto.tokenAdministrador,
  ) =>
    request(contexto.app.getHttpServer())
      .get(`${ruta}?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    contexto.app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(contexto.app);
    const laura = await registrarYObtenerSesion(contexto.app);
    const juan = await registrarOtraPersona(contexto.app);
    contexto.tokenComun = laura.token;
    contexto.tokenAdministrador = tokenDeAdministrador(laura.usuario._id);
    contexto.lauraId = laura.usuario._id;
    contexto.juanId = juan.usuario._id;
  });

  afterAll(async () => {
    await contexto.app.close();
  });

  return contexto;
}
