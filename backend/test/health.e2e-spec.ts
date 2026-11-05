import { INestApplication } from '@nestjs/common';
import { MongooseHealthIndicator } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { CloudinaryCliente } from '../src/imagenes/cloudinary.cliente.js';
import { crearApp } from './ayudas/app.js';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] con Mongo conectado responde 200 y el detalle', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(respuesta.body.status).toBe('ok');
    expect(respuesta.body.details.mongo.status).toBe('up');
    expect(respuesta.body.details.memoria.status).toBe('up');
  });

  it('[E] es público: no pide token', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('[E] si Mongo no responde, responde 503 e indica cuál falló', async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CloudinaryCliente)
      .useValue({})
      .overrideProvider(MongooseHealthIndicator)
      .useValue({
        pingCheck: async () => ({ mongo: { status: 'down' } }),
      })
      .compile();
    const caida = modulo.createNestApplication();
    await caida.init();
    const respuesta = await request(caida.getHttpServer())
      .get('/health')
      .expect(503);
    expect(respuesta.body.status).toBe('error');
    expect(respuesta.body.error.mongo.status).toBe('down');
    await caida.close();
  });
});
