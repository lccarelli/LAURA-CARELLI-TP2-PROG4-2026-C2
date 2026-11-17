import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  registrar,
  registrarOtraPersona,
  registrarYObtenerSesion,
  usuarioValido,
} from './ayudas/datos.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('GET /usuarios/:id (perfil de otra persona)', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;
  let yo: { token: string; usuario: { _id: string } };
  let otra: { token: string; usuario: { _id: string } };

  const ver = (id: string, token: string | null = yo.token) => {
    const solicitud = request(app.getHttpServer()).get(`/usuarios/${id}`);
    return token
      ? solicitud.set('Authorization', `Bearer ${token}`)
      : solicitud;
  };

  beforeAll(async () => {
    app = await crearApp();
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    yo = await registrarYObtenerSesion(app);
    otra = await registrarOtraPersona(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] devuelve los datos públicos de otra persona', async () => {
    const { body } = await ver(otra.usuario._id).expect(200);

    expect(body).toMatchObject({
      _id: otra.usuario._id,
      nombre: 'Laura',
      apellido: 'Carelli',
      nombreUsuario: 'juan_p',
      descripcion: 'Estudiante de programación',
    });
  });

  it.each(['correo', 'fechaNacimiento', 'perfil', 'habilitado', 'clave'])(
    '[I] no expone el campo privado «%s»',
    async (campo) => {
      const { body } = await ver(otra.usuario._id).expect(200);

      expect(body[campo]).toBeUndefined();
    },
  );

  it('[O] la propia persona también puede pedir su perfil', async () => {
    const { body } = await ver(yo.usuario._id).expect(200);

    expect(body.nombreUsuario).toBe('laura_c');
  });

  it('[S] con foto de perfil la incluye, y sin foto no trae el campo', async () => {
    await registrar(
      app,
      usuarioValido({ correo: 'ana@correo.com', nombreUsuario: 'ana_g' }),
      { contenido: PNG, nombre: 'foto.png', tipo: 'image/png' },
    ).expect(201);
    const conFoto = await usuarios.findOne({ nombreUsuario: 'ana_g' });

    expect(
      (await ver(String(conFoto!._id)).expect(200)).body.imagenPerfil,
    ).toEqual(expect.stringContaining('https://'));
    expect(
      (await ver(otra.usuario._id).expect(200)).body.imagenPerfil,
    ).toBeUndefined();
  });

  it('[S] una persona con perfil administrador ve lo mismo: sólo lo público', async () => {
    const { body } = await ver(
      otra.usuario._id,
      tokenDeAdministrador(yo.usuario._id),
    ).expect(200);

    expect(body.correo).toBeUndefined();
  });

  it('[E] una persona deshabilitada responde 404 USUARIO_NO_ENCONTRADO', async () => {
    await usuarios.updateOne({ _id: otra.usuario._id }, { habilitado: false });

    const { body } = await ver(otra.usuario._id).expect(404);

    expect(body.codigo).toBe('USUARIO_NO_ENCONTRADO');
  });

  it.each([
    ['no existe', '64b64b64b64b64b64b64b64b', 404],
    ['tiene un id inválido', 'abc', 400],
  ])('[E] un usuario que %s responde %i', async (_caso, id, estado) => {
    await ver(id).expect(estado);
  });

  it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
    const { body } = await ver(otra.usuario._id, null).expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });

  it('[E] con un token inválido responde 401', async () => {
    await ver(otra.usuario._id, 'falso').expect(401);
  });

  it('[I] no pisa las rutas de administración: listar y habilitar siguen siendo sólo de administrador', async () => {
    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${yo.token}`)
      .expect(403);
  });
});
