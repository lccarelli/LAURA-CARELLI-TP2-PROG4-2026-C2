import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import request from 'supertest';
import { crearApp } from './ayudas/app.js';

describe('configuracion-inicial', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[Z] la app de pruebas usa la base redsocial_test', () => {
    const conexion = app.get<Connection>(getConnectionToken());
    expect(conexion.name).toBe('redsocial_test');
  });

  it('[O] una ruta que no existe responde 404', async () => {
    await request(app.getHttpServer()).get('/no-existe').expect(404);
  });
});
