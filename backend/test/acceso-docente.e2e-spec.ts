import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { capturarLogs } from './ayudas/logs.js';

const CORREO_DOCENTE = 'laura@correo.com';

describe('POST /auth/acceso-docente', () => {
  describe('sin configurar (por defecto)', () => {
    let app: INestApplication;

    beforeAll(async () => {
      delete process.env.ACCESO_DOCENTE_CORREO;
      app = await crearApp();
    });

    beforeEach(async () => {
      await limpiarBase(app);
    });

    afterAll(async () => {
      await app.close();
    });

    it('[E] no existe: responde 404 ACCESO_DOCENTE_NO_DISPONIBLE, aunque haya administradores', async () => {
      const sesion = await registrarYObtenerSesion(app);
      await app
        .get<Model<Usuario>>(getModelToken(Usuario.name))
        .updateOne({ _id: sesion.usuario._id }, { perfil: 'administrador' });

      const { body } = await request(app.getHttpServer())
        .post('/auth/acceso-docente')
        .expect(404);

      expect(body.codigo).toBe('ACCESO_DOCENTE_NO_DISPONIBLE');
      expect(body.token).toBeUndefined();
    });
  });

  describe('configurado con el correo de la cuenta docente', () => {
    let app: INestApplication;
    let usuarios: Model<Usuario>;
    let usuarioId: string;

    const acceder = () =>
      request(app.getHttpServer()).post('/auth/acceso-docente');
    const darPerfil = (perfil: string, habilitado = true) =>
      usuarios.updateOne({ _id: usuarioId }, { perfil, habilitado });

    beforeAll(async () => {
      process.env.ACCESO_DOCENTE_CORREO = CORREO_DOCENTE.toUpperCase();
      app = await crearApp();
      usuarios = app.get(getModelToken(Usuario.name));
    });

    beforeEach(async () => {
      await limpiarBase(app);
      usuarioId = (await registrarYObtenerSesion(app)).usuario._id;
      await darPerfil('administrador');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      delete process.env.ACCESO_DOCENTE_CORREO;
      await app.close();
    });

    it('[O] sin mandar nada responde 200 con un token y el usuario administrador, sin clave', async () => {
      const { body } = await acceder().expect(200);

      expect(body.token).toEqual(expect.any(String));
      expect(body.usuario).toMatchObject({
        _id: usuarioId,
        perfil: 'administrador',
        correo: CORREO_DOCENTE,
      });
      expect(body.usuario.clave).toBeUndefined();
    });

    it('[I] el correo configurado se compara sin distinguir mayúsculas', async () => {
      await acceder().expect(200);
    });

    it('[S] el token sirve en las rutas de administrador', async () => {
      const { body } = await acceder().expect(200);

      await request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
    });

    it('[S] el token es uno común: se puede renovar y autorizar', async () => {
      const { body } = await acceder().expect(200);

      await request(app.getHttpServer())
        .post('/auth/autorizar')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/auth/refrescar')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
    });

    it('[I] queda registrado quién entró y por qué vía', async () => {
      const lineas = capturarLogs();

      await acceder().expect(200);

      expect(
        lineas.find((linea) => linea.evento === 'acceso_docente'),
      ).toMatchObject({ id_usuario: usuarioId, nombre_usuario: 'laura_c' });
    });

    it.each([
      ['la cuenta ya no tiene perfil de administrador', 'usuario', true],
      ['la cuenta está deshabilitada', 'administrador', false],
    ])(
      '[E] si %s responde 404 y no da acceso',
      async (_caso, perfil, habilitado) => {
        await darPerfil(perfil, habilitado);

        const { body } = await acceder().expect(404);

        expect(body.codigo).toBe('ACCESO_DOCENTE_NO_DISPONIBLE');
        expect(body.token).toBeUndefined();
      },
    );

    it('[E] si la cuenta no existe responde 404, igual que si estuviera apagado', async () => {
      await limpiarBase(app);

      const { body } = await acceder().expect(404);

      expect(body.codigo).toBe('ACCESO_DOCENTE_NO_DISPONIBLE');
    });

    it('[E] no acepta que se le indique otra cuenta: ignorar el cuerpo no da acceso a otra persona', async () => {
      const otra = await request(app.getHttpServer())
        .post('/auth/registro')
        .field('nombre', 'Juan')
        .field('apellido', 'Pérez')
        .field('correo', 'juan@correo.com')
        .field('nombreUsuario', 'juan_p')
        .field('clave', 'Clave1234')
        .field('fechaNacimiento', '1990-05-20')
        .field('descripcion', 'Hola');
      const idOtra = otra.body.usuario._id;

      const { body } = await acceder()
        .send({ correo: 'juan@correo.com', usuario: idOtra })
        .expect(200);

      expect(body.usuario._id).toBe(usuarioId);
    });
  });
});
