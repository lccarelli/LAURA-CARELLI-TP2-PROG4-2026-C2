import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';
import { capturarLogs } from './ayudas/logs.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('DELETE /usuarios/:id', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;
  let administradorId: string;
  let tokenAdministrador: string;
  let tokenComun: string;
  let personaId: string;

  const deshabilitar = (id: string, token = tokenAdministrador) =>
    request(app.getHttpServer())
      .delete(`/usuarios/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const habilitadoDe = async (id: string) =>
    (await usuarios.findById(id).lean())!.habilitado;

  beforeAll(async () => {
    app = await crearApp();
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const administrador = await registrarYObtenerSesion(app);
    administradorId = administrador.usuario._id;
    tokenAdministrador = tokenDeAdministrador(administradorId);
    const persona = await registrarOtraPersona(app);
    personaId = persona.usuario._id;
    tokenComun = persona.token;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('la baja', () => {
    it('[O] un administrador deshabilita a otra persona y responde 204 sin body', async () => {
      const { body } = await deshabilitar(personaId).expect(204);

      expect(body).toEqual({});
      expect(await habilitadoDe(personaId)).toBe(false);
    });

    it('[S] es una baja lógica: la persona sigue en la base y en el listado, deshabilitada', async () => {
      await deshabilitar(personaId).expect(204);

      const { body } = await request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer ${tokenAdministrador}`)
        .expect(200);

      const persona = body.datos.find(
        (usuario: { _id: string }) => usuario._id === personaId,
      );
      expect(persona.habilitado).toBe(false);
      expect(await usuarios.countDocuments()).toBe(2);
    });

    it('[S] no toca a las demás personas', async () => {
      await deshabilitar(personaId).expect(204);

      expect(await habilitadoDe(administradorId)).toBe(true);
    });

    it('[S] deshabilitar dos veces responde 204 las dos', async () => {
      await deshabilitar(personaId).expect(204);

      await deshabilitar(personaId).expect(204);

      expect(await habilitadoDe(personaId)).toBe(false);
    });

    it('[S] un administrador puede deshabilitar a otro administrador', async () => {
      await usuarios.updateOne({ _id: personaId }, { perfil: 'administrador' });

      await deshabilitar(personaId).expect(204);

      expect(await habilitadoDe(personaId)).toBe(false);
    });

    it('[S] sus datos y su perfil no cambian', async () => {
      const antes = await usuarios.findById(personaId).lean();

      await deshabilitar(personaId).expect(204);

      const despues = await usuarios.findById(personaId).lean();
      expect({ ...despues, habilitado: true }).toEqual(antes);
    });
  });

  describe('los límites', () => {
    it('[E] no se puede deshabilitar la propia cuenta: responde 400 y sigue habilitada', async () => {
      const { body } = await deshabilitar(administradorId).expect(400);

      expect(body.codigo).toBe('DESHABILITAR_CUENTA_PROPIA');
      expect(await habilitadoDe(administradorId)).toBe(true);
    });

    it('[E] una persona que no existe responde 404 USUARIO_NO_ENCONTRADO', async () => {
      const { body } = await deshabilitar(String(new Types.ObjectId())).expect(
        404,
      );

      expect(body.codigo).toBe('USUARIO_NO_ENCONTRADO');
    });

    it('[E] un id mal formado responde 400 DATOS_INVALIDOS', async () => {
      const { body } = await deshabilitar('no-es-un-id').expect(400);

      expect(body.codigo).toBe('DATOS_INVALIDOS');
    });
  });

  describe('los permisos', () => {
    it('[E] una persona común responde 403 NO_ES_ADMINISTRADOR y no deshabilita a nadie', async () => {
      const { body } = await deshabilitar(administradorId, tokenComun).expect(
        403,
      );

      expect(body.codigo).toBe('NO_ES_ADMINISTRADOR');
      expect(await habilitadoDe(administradorId)).toBe(true);
    });

    it('[E] una persona común no puede deshabilitarse a sí misma', async () => {
      await deshabilitar(personaId, tokenComun).expect(403);

      expect(await habilitadoDe(personaId)).toBe(true);
    });

    it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .delete(`/usuarios/${personaId}`)
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
      expect(await habilitadoDe(personaId)).toBe(true);
    });
  });

  describe('después de la baja, quien fue deshabilitada', () => {
    const ingresar = (identificador: string, clave = 'Clave1234') =>
      request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador, clave });

    beforeEach(async () => {
      await deshabilitar(personaId).expect(204);
    });

    it('[O] no ingresa con su correo y clave correctos: 403 USUARIO_DESHABILITADO', async () => {
      const { body } = await ingresar('juan@correo.com').expect(403);

      expect(body.codigo).toBe('USUARIO_DESHABILITADO');
      expect(body).not.toHaveProperty('token');
    });

    it('[O] tampoco con su nombre de usuario', async () => {
      const { body } = await ingresar('juan_p').expect(403);

      expect(body.codigo).toBe('USUARIO_DESHABILITADO');
    });

    it('[S] con la clave incorrecta recibe 401 CREDENCIALES_INVALIDAS y no se revela que está deshabilitada', async () => {
      const { body } = await ingresar('juan_p', 'ClaveOtra99').expect(401);

      expect(body.codigo).toBe('CREDENCIALES_INVALIDAS');
    });

    it('[S] insistir sigue dando 403', async () => {
      await ingresar('juan_p').expect(403);

      await ingresar('juan_p').expect(403);
    });

    it('[S] su token anterior ya no sirve para autorizar', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/autorizar')
        .set('Authorization', `Bearer ${tokenComun}`)
        .expect(401);

      expect(body.codigo).toBe('USUARIO_NO_AUTORIZADO');
    });

    it('[S] su token anterior ya no se puede refrescar', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/refrescar')
        .set('Authorization', `Bearer ${tokenComun}`)
        .expect(401);

      expect(body.codigo).toBe('USUARIO_NO_AUTORIZADO');
    });

    it('[S] su correo y su usuario siguen ocupados: no se puede registrar de nuevo', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/registro')
        .field('nombre', 'Juan')
        .field('apellido', 'Perez')
        .field('correo', 'juan@correo.com')
        .field('nombreUsuario', 'otro_usuario')
        .field('clave', 'Clave1234')
        .field('fechaNacimiento', '1990-05-20')
        .field('descripcion', 'Otra vez')
        .expect(409);

      expect(body.codigo).toBe('CORREO_REPETIDO');
    });

    it('[S] quienes siguen habilitadas ingresan con normalidad', async () => {
      await ingresar('laura@correo.com').expect(200);
    });
  });

  describe('refrescar con perfil actualizado', () => {
    it('[S] el token refrescado toma el perfil que tiene hoy en la base, no el del token viejo', async () => {
      await usuarios.updateOne({ _id: personaId }, { perfil: 'administrador' });

      const { body } = await request(app.getHttpServer())
        .post('/auth/refrescar')
        .set('Authorization', `Bearer ${tokenComun}`)
        .expect(200);

      const payload = JSON.parse(
        Buffer.from(body.token.split('.')[1], 'base64url').toString(),
      );
      expect(payload.perfil).toBe('administrador');
    });
  });

  describe('trazabilidad', () => {
    it('[S] registra quién deshabilitó a quién', async () => {
      const lineas = capturarLogs();

      await deshabilitar(personaId).expect(204);

      expect(
        lineas.find((linea) => linea.evento === 'usuario_deshabilitado'),
      ).toMatchObject({
        id_usuario: personaId,
        id_administrador: administradorId,
      });
    });

    it('[S] deshabilitar a quien ya lo estaba no vuelve a registrar la baja', async () => {
      await deshabilitar(personaId).expect(204);
      const lineas = capturarLogs();

      await deshabilitar(personaId).expect(204);

      expect(
        lineas.filter((linea) => linea.evento === 'usuario_deshabilitado'),
      ).toHaveLength(0);
    });

    it('[S] el ingreso rechazado queda registrado como advertencia, sin la clave', async () => {
      await deshabilitar(personaId).expect(204);
      const lineas = capturarLogs();

      await request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador: 'juan_p', clave: 'Clave1234' })
        .expect(403);

      expect(
        lineas.find((linea) => linea.evento === 'ingreso_rechazado'),
      ).toMatchObject({
        nivel: 'warn',
        id_usuario: personaId,
        nombre_usuario: 'juan_p',
      });
      expect(JSON.stringify(lineas)).not.toContain('Clave1234');
    });
  });
});
