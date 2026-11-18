import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';

describe('JWT_EXPIRA', () => {
  let app: INestApplication;

  beforeAll(async () => {
    vi.stubEnv('JWT_EXPIRA', '2m');
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  const duracionDe = (token: string) => {
    const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
    return exp - iat;
  };

  it('[O] el registro entrega un token con la duración configurada', async () => {
    const { token } = await registrarYObtenerSesion(app);

    expect(duracionDe(token)).toBe(120);
  });

  it('[O] el ingreso entrega un token con la duración configurada', async () => {
    await registrarYObtenerSesion(app);

    const { body } = await request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador: 'laura_c', clave: 'Clave1234' })
      .expect(200);

    expect(duracionDe(body.token)).toBe(120);
  });

  it('[S] la renovación conserva la duración configurada', async () => {
    const { token } = await registrarYObtenerSesion(app);

    const { body } = await request(app.getHttpServer())
      .post('/auth/refrescar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(duracionDe(body.token)).toBe(120);
  });
});
