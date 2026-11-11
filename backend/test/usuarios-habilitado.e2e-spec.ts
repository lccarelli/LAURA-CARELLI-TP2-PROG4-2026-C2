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

describe('PATCH /usuarios/:id', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;
  let administradorId: string;
  let tokenAdministrador: string;
  let tokenComun: string;
  let personaId: string;

  const cambiar = (id: string, body: object, token = tokenAdministrador) =>
    request(app.getHttpServer())
      .patch(`/usuarios/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const deshabilitar = (id: string, token = tokenAdministrador) =>
    cambiar(id, { habilitado: false }, token);
  const habilitar = (id: string, token = tokenAdministrador) =>
    cambiar(id, { habilitado: true }, token);

  const habilitadoDe = async (id: string) =>
    (await usuarios.findById(id).lean())!.habilitado;

  const ingresar = (identificador: string, clave = 'Clave1234') =>
    request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador, clave });

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

  describe('deshabilitar', () => {
    it('[O] un administrador deshabilita a otra persona y responde 200 con ella ya deshabilitada', async () => {
      const { body } = await deshabilitar(personaId).expect(200);

      expect(body).toMatchObject({
        _id: personaId,
        nombreUsuario: 'juan_p',
        habilitado: false,
      });
      expect(await habilitadoDe(personaId)).toBe(false);
    });

    it('[S] es una baja lógica: la persona sigue en la base y en el listado, deshabilitada', async () => {
      await deshabilitar(personaId).expect(200);

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

    it('[S] no devuelve la clave', async () => {
      const { body } = await deshabilitar(personaId).expect(200);

      expect(body).not.toHaveProperty('clave');
    });

    it('[S] no toca a las demás personas', async () => {
      await deshabilitar(personaId).expect(200);

      expect(await habilitadoDe(administradorId)).toBe(true);
    });

    it('[S] deshabilitar dos veces responde 200 las dos y deja el mismo estado', async () => {
      await deshabilitar(personaId).expect(200);

      const { body } = await deshabilitar(personaId).expect(200);

      expect(body.habilitado).toBe(false);
    });

    it('[S] un administrador puede deshabilitar a otro administrador', async () => {
      await usuarios.updateOne({ _id: personaId }, { perfil: 'administrador' });

      await deshabilitar(personaId).expect(200);

      expect(await habilitadoDe(personaId)).toBe(false);
    });

    it('[S] sus datos y su perfil no cambian', async () => {
      const antes = await usuarios.findById(personaId).lean();

      await deshabilitar(personaId).expect(200);

      const despues = await usuarios.findById(personaId).lean();
      expect({ ...despues, habilitado: true }).toEqual(antes);
    });
  });

  describe('habilitar', () => {
    beforeEach(async () => {
      await usuarios.updateOne({ _id: personaId }, { habilitado: false });
    });

    it('[O] un administrador habilita a una persona deshabilitada y responde 200 con ella ya habilitada', async () => {
      const { body } = await habilitar(personaId).expect(200);

      expect(body).toMatchObject({ _id: personaId, habilitado: true });
      expect(await habilitadoDe(personaId)).toBe(true);
    });

    it('[S] habilitar a quien ya estaba habilitada responde 200 y no cambia nada', async () => {
      await habilitar(personaId).expect(200);

      await habilitar(personaId).expect(200);

      expect(await habilitadoDe(personaId)).toBe(true);
    });

    it('[S] sus datos y su perfil no cambian', async () => {
      const antes = await usuarios.findById(personaId).lean();

      await habilitar(personaId).expect(200);

      const despues = await usuarios.findById(personaId).lean();
      expect({ ...despues, habilitado: false }).toEqual(antes);
    });

    it('[S] deshabilitar y habilitar de nuevo deja a la persona como estaba', async () => {
      await habilitar(personaId).expect(200);
      await deshabilitar(personaId).expect(200);
      await ingresar('juan_p').expect(403);

      await habilitar(personaId).expect(200);

      await ingresar('juan_p').expect(200);
    });
  });

  describe('los límites', () => {
    it('[E] no se puede deshabilitar la propia cuenta: responde 400 CUENTA_PROPIA y sigue habilitada', async () => {
      const { body } = await deshabilitar(administradorId).expect(400);

      expect(body.codigo).toBe('CUENTA_PROPIA');
      expect(await habilitadoDe(administradorId)).toBe(true);
    });

    it('[E] un administrador deshabilitado no puede habilitarse a sí mismo con su token vigente', async () => {
      await usuarios.updateOne({ _id: administradorId }, { habilitado: false });

      const { body } = await habilitar(administradorId).expect(400);

      expect(body.codigo).toBe('CUENTA_PROPIA');
      expect(await habilitadoDe(administradorId)).toBe(false);
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

  describe('el body', () => {
    it('[Z] sin body responde 400 DATOS_INVALIDOS y no cambia nada', async () => {
      const { body } = await cambiar(personaId, {}).expect(400);

      expect(body.codigo).toBe('DATOS_INVALIDOS');
      expect(await habilitadoDe(personaId)).toBe(true);
    });

    it.each([['false'], ['true'], [0], [1], [null]])(
      '[I] habilitado con el valor %j, que no es booleano, responde 400',
      async (valor) => {
        await cambiar(personaId, { habilitado: valor }).expect(400);

        expect(await habilitadoDe(personaId)).toBe(true);
      },
    );

    it('[I] un campo que no es habilitado responde 400 y no cambia nada', async () => {
      await cambiar(personaId, {
        habilitado: false,
        perfil: 'administrador',
      }).expect(400);

      const guardada = await usuarios.findById(personaId).lean();
      expect(guardada).toMatchObject({ habilitado: true, perfil: 'usuario' });
    });

    it('[I] no se puede cambiar otro dato por este endpoint', async () => {
      await cambiar(personaId, { nombre: 'Otro' }).expect(400);

      expect((await usuarios.findById(personaId).lean())!.nombre).toBe('Laura');
    });
  });

  describe('las rutas anteriores', () => {
    it('[I] ya no existe DELETE /usuarios/:id: deshabilitar es un PATCH', async () => {
      await request(app.getHttpServer())
        .delete(`/usuarios/${personaId}`)
        .set('Authorization', `Bearer ${tokenAdministrador}`)
        .expect(404);

      expect(await habilitadoDe(personaId)).toBe(true);
    });

    it('[I] ya no existe POST /usuarios/:id/habilitar: habilitar es un PATCH', async () => {
      await usuarios.updateOne({ _id: personaId }, { habilitado: false });

      await request(app.getHttpServer())
        .post(`/usuarios/${personaId}/habilitar`)
        .set('Authorization', `Bearer ${tokenAdministrador}`)
        .expect(404);

      expect(await habilitadoDe(personaId)).toBe(false);
    });
  });

  describe('los permisos', () => {
    it('[E] una persona común responde 403 NO_ES_ADMINISTRADOR y no cambia a nadie', async () => {
      const { body } = await deshabilitar(administradorId, tokenComun).expect(
        403,
      );

      expect(body.codigo).toBe('NO_ES_ADMINISTRADOR');
      expect(await habilitadoDe(administradorId)).toBe(true);
    });

    it('[E] una persona común no puede habilitar a nadie', async () => {
      await usuarios.updateOne({ _id: administradorId }, { habilitado: false });

      await habilitar(administradorId, tokenComun).expect(403);

      expect(await habilitadoDe(administradorId)).toBe(false);
    });

    it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/usuarios/${personaId}`)
        .send({ habilitado: false })
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
      expect(await habilitadoDe(personaId)).toBe(true);
    });
  });

  describe('después de deshabilitar, quien fue deshabilitada', () => {
    beforeEach(async () => {
      await deshabilitar(personaId).expect(200);
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

    it('[O] al habilitarla vuelve a ingresar con la misma clave y su token nuevo sirve para autorizar y refrescar', async () => {
      await habilitar(personaId).expect(200);

      const { body } = await ingresar('juan_p').expect(200);

      await request(app.getHttpServer())
        .post('/auth/autorizar')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/auth/refrescar')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
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

      await deshabilitar(personaId).expect(200);

      expect(
        lineas.find((linea) => linea.evento === 'usuario_deshabilitado'),
      ).toMatchObject({
        id_usuario: personaId,
        id_administrador: administradorId,
      });
    });

    it('[S] registra quién habilitó a quién', async () => {
      await usuarios.updateOne({ _id: personaId }, { habilitado: false });
      const lineas = capturarLogs();

      await habilitar(personaId).expect(200);

      expect(
        lineas.find((linea) => linea.evento === 'usuario_habilitado'),
      ).toMatchObject({
        id_usuario: personaId,
        id_administrador: administradorId,
      });
    });

    it('[S] repetir el mismo estado no vuelve a registrar el cambio', async () => {
      await deshabilitar(personaId).expect(200);
      const lineas = capturarLogs();

      await deshabilitar(personaId).expect(200);

      expect(
        lineas.filter((linea) => linea.evento === 'usuario_deshabilitado'),
      ).toHaveLength(0);
    });

    it('[S] el ingreso rechazado queda registrado como advertencia, sin la clave', async () => {
      await deshabilitar(personaId).expect(200);
      const lineas = capturarLogs();

      await ingresar('juan_p').expect(403);

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
