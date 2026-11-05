import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './ayudas/app.js';

describe('límites de solicitudes', () => {
  let app: INestApplication;

  const ingresar = () =>
    request(app.getHttpServer()).post('/auth/ingresar').send({});
  const repetir = async (cantidad: number, solicitud: () => request.Test) => {
    const estados: number[] = [];
    for (let vez = 0; vez < cantidad; vez++) {
      estados.push((await solicitud()).status);
    }
    return estados;
  };

  beforeEach(async () => {
    app = await crearApp(true);
  });

  afterEach(async () => {
    await app.close();
  });

  it('[O] el ingreso admite 3 solicitudes por segundo y el cuarto responde 429', async () => {
    const estados = await repetir(4, ingresar);

    expect(estados).toEqual([400, 400, 400, 429]);
  });

  it('[O] la respuesta 429 trae el código y cuánto esperar', async () => {
    await repetir(3, ingresar);

    const { status, body, headers } = await ingresar();

    expect(status).toBe(429);
    expect(body.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(Number(headers['retry-after'])).toBeGreaterThan(0);
  });

  it('[M] el registro tiene el mismo límite que el ingreso', async () => {
    const estados = await repetir(4, () =>
      request(app.getHttpServer()).post('/auth/registro').send({}),
    );

    expect(estados).toEqual([400, 400, 400, 429]);
  });

  it('[B] pasado un segundo vuelve a aceptar solicitudes', async () => {
    await repetir(4, ingresar);
    await new Promise((resolver) => setTimeout(resolver, 1100));

    const { status } = await ingresar();

    expect(status).toBe(400);
  });

  it('[S] con más de 10 intentos en un minuto, el ingreso queda bloqueado 5 minutos', async () => {
    for (let ronda = 0; ronda < 4; ronda++) {
      await repetir(3, ingresar);
      await new Promise((resolver) => setTimeout(resolver, 1100));
    }

    const { status, headers } = await ingresar();

    expect(status).toBe(429);
    expect(Number(headers['retry-after'])).toBeGreaterThan(60);
  }, 15000);

  it('[I] el resto de las rutas admite 10 solicitudes por segundo', async () => {
    const estados = await repetir(11, () =>
      request(app.getHttpServer()).get('/publicaciones'),
    );

    expect(estados.slice(0, 10).every((estado) => estado === 401)).toBe(true);
    expect(estados[10]).toBe(429);
  });

  it('[E] /health no tiene límite', async () => {
    const estados = await repetir(15, () =>
      request(app.getHttpServer()).get('/health'),
    );

    expect(estados.every((estado) => estado === 200)).toBe(true);
  });
});
