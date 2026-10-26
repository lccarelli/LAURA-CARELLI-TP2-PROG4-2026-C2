import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrar, usuarioValido } from './ayudas/datos.js';

describe('códigos de error de la API', () => {
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

  it('[I] un body inválido responde DATOS_INVALIDOS con la lista de mensajes', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/registro')
      .expect(400);

    expect(body.codigo).toBe('DATOS_INVALIDOS');
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('[I] un campo desconocido también responde DATOS_INVALIDOS', async () => {
    const { body } = await registrar(
      app,
      usuarioValido({ perfil: 'administrador' }),
    ).expect(400);

    expect(body.codigo).toBe('DATOS_INVALIDOS');
  });

  it('[I] una fecha de nacimiento futura responde FECHA_FUTURA', async () => {
    const { body } = await registrar(
      app,
      usuarioValido({ fechaNacimiento: '2999-01-01' }),
    ).expect(400);

    expect(body.codigo).toBe('FECHA_FUTURA');
  });

  it('[I] un correo repetido responde CORREO_REPETIDO', async () => {
    await registrar(app).expect(201);

    const { body } = await registrar(
      app,
      usuarioValido({ nombreUsuario: 'otra_pers' }),
    ).expect(409);

    expect(body.codigo).toBe('CORREO_REPETIDO');
  });

  it('[I] un nombre de usuario repetido responde USUARIO_REPETIDO', async () => {
    await registrar(app).expect(201);

    const { body } = await registrar(
      app,
      usuarioValido({ correo: 'otra@correo.com' }),
    ).expect(409);

    expect(body.codigo).toBe('USUARIO_REPETIDO');
  });

  it('[I] un archivo que no es imagen responde IMAGEN_TIPO_INVALIDO', async () => {
    const { body } = await registrar(app, usuarioValido(), {
      contenido: Buffer.from('texto plano'),
      nombre: 'nota.txt',
      tipo: 'text/plain',
    }).expect(400);

    expect(body.codigo).toBe('IMAGEN_TIPO_INVALIDO');
  });

  it('[I] una clave incorrecta responde CREDENCIALES_INVALIDAS', async () => {
    await registrar(app).expect(201);

    const { body } = await request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador: 'laura_c', clave: 'Equivocada1' })
      .expect(401);

    expect(body.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  it('[I] un pedido sin token responde TOKEN_AUSENTE', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/publicaciones')
      .expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });

  it('[I] un token que no es válido responde TOKEN_INVALIDO', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/publicaciones')
      .set('Authorization', 'Bearer esto-no-es-un-token')
      .expect(401);

    expect(body.codigo).toBe('TOKEN_INVALIDO');
  });

  it('[I] una imagen inexistente responde IMAGEN_NO_ENCONTRADA', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/imagenes/507f1f77bcf86cd799439011')
      .expect(404);

    expect(body.codigo).toBe('IMAGEN_NO_ENCONTRADA');
  });
});
