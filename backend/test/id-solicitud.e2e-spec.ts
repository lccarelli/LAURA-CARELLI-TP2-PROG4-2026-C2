import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './ayudas/app.js';

describe('id de solicitud', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[Z] toda respuesta trae un id de solicitud', async () => {
    const respuesta = await request(app.getHttpServer()).get('/health');

    expect(respuesta.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('[O] conserva el id que manda el cliente', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'cliente-12345678');

    expect(respuesta.headers['x-request-id']).toBe('cliente-12345678');
  });

  it('[M] la línea de log de la solicitud lleva ese mismo id', async () => {
    const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'cliente-87654321');

    const lineas = salida.mock.calls.map(([linea]) =>
      JSON.parse(String(linea)),
    );
    salida.mockRestore();
    const solicitud = lineas.find(
      (linea) => linea.evento === 'solicitud_exitosa',
    );
    expect(solicitud).toMatchObject({
      id_solicitud: 'cliente-87654321',
      estado_http: 200,
    });
  });

  it('[B] el log de un módulo interno también lleva el id de la solicitud', async () => {
    const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await request(app.getHttpServer())
      .get('/publicaciones')
      .set('X-Request-Id', 'cliente-11112222');

    const lineas = salida.mock.calls.map(([linea]) =>
      JSON.parse(String(linea)),
    );
    salida.mockRestore();
    const rechazo = lineas.find((linea) => linea.evento === 'token_ausente');
    expect(rechazo).toMatchObject({
      modulo: 'AuthGuard',
      id_solicitud: 'cliente-11112222',
    });
  });
});
