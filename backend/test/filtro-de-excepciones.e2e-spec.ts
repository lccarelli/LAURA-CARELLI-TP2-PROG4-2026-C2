import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import { PNG, pngDeTamano, registrar, usuarioValido } from './ayudas/datos.js';

describe('filtro global de excepciones', () => {
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

  const imagenPng = { contenido: PNG, nombre: 'foto.png', tipo: 'image/png' };

  it('[I] una ruta que no existe responde 404 RUTA_NO_ENCONTRADA', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/no-existe')
      .expect(404);

    expect(body).toEqual({
      message: 'La ruta no existe',
      codigo: 'RUTA_NO_ENCONTRADA',
    });
  });

  it('[I] una imagen de más de 2 MB responde 413 ARCHIVO_DEMASIADO_GRANDE', async () => {
    const { body } = await registrar(app, usuarioValido(), {
      ...imagenPng,
      contenido: pngDeTamano(2 * 1024 * 1024 + 1),
    }).expect(413);

    expect(body.codigo).toBe('ARCHIVO_DEMASIADO_GRANDE');
    expect(typeof body.message).toBe('string');
  });

  it('[E] un error no previsto responde 500 ERROR_INESPERADO sin revelar la causa', async () => {
    cloudinaryFalso.subir.mockRejectedValueOnce(new Error('clave-secreta'));

    const { body } = await registrar(app, usuarioValido(), imagenPng).expect(
      500,
    );

    expect(body).toEqual({
      message: 'Ocurrió un error inesperado',
      codigo: 'ERROR_INESPERADO',
    });
    expect(JSON.stringify(body)).not.toContain('clave-secreta');
  });

  it('[E] un archivo en un campo que no existe responde 400 SOLICITUD_INVALIDA', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/registro')
      .attach('otro', PNG, { filename: 'foto.png', contentType: 'image/png' })
      .expect(400);

    expect(body.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('[E] un JSON mal formado responde 400 SOLICITUD_INVALIDA', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/ingresar')
      .set('Content-Type', 'application/json')
      .send('{"identificador": ')
      .expect(400);

    expect(body.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('[S] una excepción con código propio no se modifica', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/autorizar')
      .expect(401);

    expect(body).toEqual({
      message: 'Falta el token',
      codigo: 'TOKEN_AUSENTE',
    });
  });

  it('[S] los errores de validación conservan la lista de mensajes', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({})
      .expect(400);

    expect(body.codigo).toBe('DATOS_INVALIDOS');
    expect(Array.isArray(body.message)).toBe(true);
  });
});
