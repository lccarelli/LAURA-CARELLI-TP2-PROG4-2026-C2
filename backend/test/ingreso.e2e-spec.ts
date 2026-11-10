import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrar, usuarioValido } from './ayudas/datos.js';

describe('POST /auth/ingresar', () => {
  let app: INestApplication;

  const ingresar = (body: object) =>
    request(app.getHttpServer()).post('/auth/ingresar').send(body);

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('sin datos', () => {
    it('[Z] sin body responde 400', async () => {
      await ingresar({}).expect(400);
    });

    it('[Z] con la base vacía, cualquier credencial responde 401', async () => {
      await ingresar({
        identificador: 'laura@correo.com',
        clave: 'Clave1234',
      }).expect(401);
    });
  });

  describe('un ingreso', () => {
    it('[O] un usuario registrado ingresa por correo', async () => {
      await registrar(app).expect(201);

      const respuesta = await ingresar({
        identificador: 'laura@correo.com',
        clave: 'Clave1234',
      }).expect(200);

      expect(typeof respuesta.body.token).toBe('string');
      expect(respuesta.body.usuario.nombreUsuario).toBe('laura_c');
    });

    it('[O] devuelve todos los datos del usuario, sin la clave', async () => {
      await registrar(app).expect(201);

      const { body } = await ingresar({
        identificador: 'laura@correo.com',
        clave: 'Clave1234',
      }).expect(200);

      expect(
        Object.keys(body.usuario).sort((a, b) => a.localeCompare(b)),
      ).toEqual([
        '_id',
        'apellido',
        'correo',
        'descripcion',
        'fechaNacimiento',
        'habilitado',
        'nombre',
        'nombreUsuario',
        'perfil',
      ]);
    });
  });

  describe('varios ingresos', () => {
    it('[M] el mismo usuario ingresa por nombre de usuario', async () => {
      await registrar(app).expect(201);

      await ingresar({ identificador: 'laura_c', clave: 'Clave1234' }).expect(
        200,
      );
    });

    it('[M] dos usuarios obtienen tokens con su propio id', async () => {
      const laura = await registrar(app).expect(201);
      const juan = await registrar(
        app,
        usuarioValido({ correo: 'juan@correo.com', nombreUsuario: 'juan_p' }),
      ).expect(201);

      const tokenLaura = await ingresar({
        identificador: 'laura_c',
        clave: 'Clave1234',
      }).expect(200);
      const tokenJuan = await ingresar({
        identificador: 'juan_p',
        clave: 'Clave1234',
      }).expect(200);

      expect(jwt.decode(tokenLaura.body.token)!.sub).toBe(
        laura.body.usuario._id,
      );
      expect(jwt.decode(tokenJuan.body.token)!.sub).toBe(juan.body.usuario._id);
    });
  });

  describe('bordes', () => {
    it('[B] el correo en mayúsculas ingresa igual', async () => {
      await registrar(app).expect(201);

      await ingresar({
        identificador: 'LAURA@Correo.com',
        clave: 'Clave1234',
      }).expect(200);
    });

    it('[B] un correo de 30 caracteres ingresa y uno de 31 responde 400', async () => {
      const correo = (largo: number) =>
        'a'.repeat(largo - '@correo.com'.length) + '@correo.com';
      await registrar(app, usuarioValido({ correo: correo(30) })).expect(201);

      await ingresar({ identificador: correo(30), clave: 'Clave1234' }).expect(
        200,
      );
      await ingresar({ identificador: correo(31), clave: 'Clave1234' }).expect(
        400,
      );
    });

    it('[B] un nombre de usuario de 20 caracteres ingresa', async () => {
      const nombreUsuario = 'laura_c1234567890123';
      await registrar(app, usuarioValido({ nombreUsuario })).expect(201);

      await ingresar({
        identificador: nombreUsuario,
        clave: 'Clave1234',
      }).expect(200);
    });

    it('[B] una clave de 12 caracteres ingresa y una de 13 responde 400', async () => {
      const clave = 'Clave1' + 'a'.repeat(6);
      await registrar(app, usuarioValido({ clave })).expect(201);

      await ingresar({ identificador: 'laura_c', clave }).expect(200);
      await ingresar({ identificador: 'laura_c', clave: clave + 'a' }).expect(
        400,
      );
    });
  });

  describe('contrato', () => {
    it('[I] un identificador que es un objeto responde 400', async () => {
      await registrar(app).expect(201);

      await ingresar({
        identificador: { $ne: null },
        clave: 'Clave1234',
      }).expect(400);
    });

    it('[I] un campo desconocido responde 400', async () => {
      await ingresar({
        identificador: 'laura_c',
        clave: 'Clave1234',
        perfil: 'administrador',
      }).expect(400);
    });
  });

  describe('errores', () => {
    it('[E] una clave incorrecta responde 401', async () => {
      await registrar(app).expect(201);

      await ingresar({ identificador: 'laura_c', clave: 'Equivocada1' }).expect(
        401,
      );
    });

    it('[E] un usuario inexistente responde 401 con el mismo mensaje', async () => {
      await registrar(app).expect(201);

      const claveMal = await ingresar({
        identificador: 'laura_c',
        clave: 'Equivocada1',
      });
      const sinUsuario = await ingresar({
        identificador: 'nadie',
        clave: 'Clave1234',
      });

      expect(sinUsuario.status).toBe(401);
      expect(sinUsuario.body.message).toBe(claveMal.body.message);
    });
  });

  describe('escenarios simples', () => {
    it('[S] el token lleva el id y el perfil, y dura 15 minutos', async () => {
      const registro = await registrar(app).expect(201);

      const { body } = await ingresar({
        identificador: 'laura@correo.com',
        clave: 'Clave1234',
      }).expect(200);

      const payload = jwt.decode(body.token) as jwt.JwtPayload;
      expect(payload.sub).toBe(registro.body.usuario._id);
      expect(payload.perfil).toBe('usuario');
      expect(payload.exp! - payload.iat!).toBe(15 * 60);
    });
  });
});
