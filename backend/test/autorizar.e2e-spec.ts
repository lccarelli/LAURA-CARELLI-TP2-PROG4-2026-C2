import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import jwt from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';

describe('POST /auth/autorizar', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;

  const autorizar = (tokenUsado: string | null = token) => {
    const solicitud = request(app.getHttpServer()).post('/auth/autorizar');
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };
  const firmar = (
    datos: Record<string, unknown>,
    opciones: jwt.SignOptions = { expiresIn: '10m' },
    secreto = process.env.JWT_SECRET!,
  ) =>
    jwt.sign(
      { sub: usuarioId, perfil: 'usuario', ...datos },
      secreto,
      opciones,
    );

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    token = sesion.token;
    usuarioId = sesion.usuario._id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] con un token válido devuelve los datos del usuario', async () => {
    const { body } = await autorizar().expect(200);

    expect(body.usuario._id).toBe(usuarioId);
    expect(body.usuario.nombreUsuario).toBe('laura_c');
    expect(body.usuario.perfil).toBe('usuario');
  });

  it('[S] nunca devuelve la clave', async () => {
    const { body } = await autorizar().expect(200);

    expect(body.usuario).not.toHaveProperty('clave');
  });

  it('[S] devuelve los datos actuales de la base, no los que decía el token', async () => {
    await app
      .get<Model<Usuario>>(getModelToken(Usuario.name))
      .updateOne({ _id: usuarioId }, { perfil: 'administrador' });

    const { body } = await autorizar().expect(200);

    expect(body.usuario.perfil).toBe('administrador');
  });

  it('[S] no entrega un token nuevo', async () => {
    const { body } = await autorizar().expect(200);

    expect(body).not.toHaveProperty('token');
  });

  it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
    const { body } = await autorizar(null).expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });

  it('[E] un token vencido responde 401 TOKEN_INVALIDO', async () => {
    const { body } = await autorizar(firmar({}, { expiresIn: -10 })).expect(
      401,
    );

    expect(body.codigo).toBe('TOKEN_INVALIDO');
  });

  it('[E] un token mal formado o firmado con otro secreto responde 401', async () => {
    await autorizar('esto-no-es-un-token').expect(401);
    await autorizar(firmar({}, { expiresIn: '10m' }, 'otro-secreto')).expect(
      401,
    );
  });

  it('[E] un token de un usuario que ya no existe responde 401 USUARIO_NO_AUTORIZADO', async () => {
    const inexistente = firmar({ sub: String(new Types.ObjectId()) });

    const { body } = await autorizar(inexistente).expect(401);

    expect(body.codigo).toBe('USUARIO_NO_AUTORIZADO');
  });

  it('[E] un usuario deshabilitado responde 401 USUARIO_NO_AUTORIZADO', async () => {
    await app
      .get<Model<Usuario>>(getModelToken(Usuario.name))
      .updateOne({ _id: usuarioId }, { habilitado: false });

    const { body } = await autorizar().expect(401);

    expect(body.codigo).toBe('USUARIO_NO_AUTORIZADO');
  });

  it('[E] un id que no es un ObjectId en el token responde 401 y no un 500', async () => {
    await autorizar(firmar({ sub: 'no-es-un-id' })).expect(401);
  });
});
