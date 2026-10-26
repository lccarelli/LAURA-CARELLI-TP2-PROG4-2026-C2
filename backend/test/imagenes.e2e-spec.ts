import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ImagenesService } from '../src/imagenes/imagenes.service.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { PNG } from './ayudas/datos.js';

describe('GET /imagenes/:id', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[Z] con la base vacía, un id válido responde 404', async () => {
    await request(app.getHttpServer())
      .get('/imagenes/507f1f77bcf86cd799439011')
      .expect(404);
  });

  it('[O] una imagen guardada se devuelve con su tipo', async () => {
    const { id } = await app
      .get(ImagenesService)
      .guardar({ buffer: PNG, mimetype: 'image/png' } as Express.Multer.File);

    const respuesta = await request(app.getHttpServer())
      .get(`/imagenes/${id}`)
      .expect(200);

    expect(respuesta.headers['content-type']).toBe('image/png');
    expect(respuesta.body).toEqual(PNG);
  });

  it('[I] la respuesta puede guardarse en caché', async () => {
    const { id } = await app
      .get(ImagenesService)
      .guardar({ buffer: PNG, mimetype: 'image/png' } as Express.Multer.File);

    const respuesta = await request(app.getHttpServer()).get(`/imagenes/${id}`);

    expect(respuesta.headers['cache-control']).toContain('max-age');
  });

  it('[E] un id mal formado responde 400', async () => {
    await request(app.getHttpServer()).get('/imagenes/123').expect(400);
  });
});
