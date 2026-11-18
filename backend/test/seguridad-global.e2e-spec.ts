import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './ayudas/app.js';

describe('encabezados de seguridad', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[I] una ruta pública responde con los encabezados de helmet', async () => {
    const { headers } = await request(app.getHttpServer())
      .get('/publico/publicaciones')
      .expect(200);

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('[I] no revela que corre sobre Express', async () => {
    const { headers } = await request(app.getHttpServer())
      .get('/publico/publicaciones')
      .expect(200);

    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('[E] un error también lleva los encabezados', async () => {
    const { headers } = await request(app.getHttpServer())
      .get('/no-existe')
      .expect(404);

    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('[S] el identificador de solicitud sigue llegando con helmet', async () => {
    const { headers } = await request(app.getHttpServer())
      .get('/publico/publicaciones')
      .expect(200);

    expect(headers['x-request-id']).toBeDefined();
  });
});
