import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';

describe('GET /usuarios', () => {
  let app: INestApplication;
  let tokenAdministrador: string;
  let tokenComun: string;

  const listar = (consulta = '', token = tokenAdministrador) =>
    request(app.getHttpServer())
      .get(`/usuarios${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const registrarVarias = async (cantidad: number) => {
    for (let i = 1; i <= cantidad; i++) {
      await registrarYObtenerSesion(app, {
        correo: `persona${i}@correo.com`,
        nombreUsuario: `persona_${i}`,
      });
    }
  };

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    tokenComun = sesion.token;
    tokenAdministrador = tokenDeAdministrador(sesion.usuario._id);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] un administrador recibe el listado con sus datos', async () => {
    const { body } = await listar().expect(200);

    expect(body.datos).toHaveLength(1);
    expect(body.datos[0]).toMatchObject({
      nombre: 'Laura',
      apellido: 'Carelli',
      correo: 'laura@correo.com',
      nombreUsuario: 'laura_c',
      perfil: 'usuario',
      habilitado: true,
    });
    expect(body.hayMas).toBe(false);
  });

  it('[S] nunca devuelve la clave', async () => {
    const { body } = await listar().expect(200);

    expect(body.datos[0]).not.toHaveProperty('clave');
    expect(JSON.stringify(body)).not.toContain('Clave1234');
  });

  it('[S] devuelve primero a quien se registró último', async () => {
    await registrarVarias(2);

    const { body } = await listar().expect(200);

    expect(
      body.datos.map((u: { nombreUsuario: string }) => u.nombreUsuario),
    ).toEqual(['persona_2', 'persona_1', 'laura_c']);
  });

  it('[S] también lista a las personas deshabilitadas', async () => {
    await registrarVarias(1);
    await app
      .get<Model<Usuario>>(getModelToken(Usuario.name))
      .updateOne({ nombreUsuario: 'persona_1' }, { habilitado: false });

    const { body } = await listar().expect(200);

    expect(body.datos[0]).toMatchObject({
      nombreUsuario: 'persona_1',
      habilitado: false,
    });
  });

  it('[B] paginar de a uno marca hayMas hasta el último', async () => {
    await registrarVarias(2);

    const primera = await listar('?limit=1').expect(200);
    const ultima = await listar('?offset=2&limit=1').expect(200);

    expect(primera.body).toMatchObject({ offset: 0, limit: 1, hayMas: true });
    expect(ultima.body).toMatchObject({ offset: 2, limit: 1, hayMas: false });
    expect(ultima.body.datos[0].nombreUsuario).toBe('laura_c');
  });

  it('[B] un offset más allá del final devuelve la lista vacía', async () => {
    const { body } = await listar('?offset=50').expect(200);

    expect(body.datos).toEqual([]);
    expect(body.hayMas).toBe(false);
  });

  it('[I] un limit mayor a 50 responde 400', async () => {
    const { body } = await listar('?limit=51').expect(400);

    expect(body.codigo).toBe('DATOS_INVALIDOS');
  });

  it('[E] una persona común responde 403 NO_ES_ADMINISTRADOR', async () => {
    const { body } = await listar('', tokenComun).expect(403);

    expect(body.codigo).toBe('NO_ES_ADMINISTRADOR');
  });

  it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/usuarios')
      .expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });
});
