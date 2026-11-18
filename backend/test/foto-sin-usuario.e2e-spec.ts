import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Imagen } from '../src/imagenes/schemas/imagen.schema.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { UsuariosService } from '../src/usuarios/usuarios.service.js';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  PUBLIC_ID_IMAGEN_SUBIDA,
  crearUsuario,
  registrar,
  registrarYObtenerSesion,
  usuarioValido,
} from './ayudas/datos.js';
import { capturarLogs } from './ayudas/logs.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('la foto de un alta que falla no queda sin dueño', () => {
  let app: INestApplication;
  let imagenes: Model<Imagen>;
  let usuarios: Model<Usuario>;

  const foto = { contenido: PNG, nombre: 'foto.png', tipo: 'image/png' };

  beforeAll(async () => {
    app = await crearApp();
    imagenes = app.get(getModelToken(Imagen.name));
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('registro', () => {
    it('[I] con el correo repetido responde 409 y borra la foto subida y su registro', async () => {
      await registrar(app).expect(201);

      const { body } = await registrar(
        app,
        usuarioValido({ nombreUsuario: 'otra_pers' }),
        foto,
      ).expect(409);

      expect(body.codigo).toBe('CORREO_REPETIDO');
      expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(1);
      expect(cloudinaryFalso.borrar).toHaveBeenCalledExactlyOnceWith(
        PUBLIC_ID_IMAGEN_SUBIDA,
      );
      expect(await imagenes.countDocuments()).toBe(0);
    });

    it('[I] con el nombre de usuario repetido responde 409 y borra la foto subida', async () => {
      await registrar(app).expect(201);

      const { body } = await registrar(
        app,
        usuarioValido({ correo: 'otra@correo.com' }),
        foto,
      ).expect(409);

      expect(body.codigo).toBe('USUARIO_REPETIDO');
      expect(cloudinaryFalso.borrar).toHaveBeenCalledTimes(1);
      expect(await imagenes.countDocuments()).toBe(0);
    });

    it('[Z] sin foto no hay nada que borrar', async () => {
      await registrar(app).expect(201);

      await registrar(app).expect(409);

      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
      expect(cloudinaryFalso.borrar).not.toHaveBeenCalled();
    });

    it('[S] un registro que sale bien conserva la foto y su registro', async () => {
      await registrar(app, usuarioValido(), foto).expect(201);

      expect(cloudinaryFalso.borrar).not.toHaveBeenCalled();
      expect(await imagenes.countDocuments()).toBe(1);
    });

    it('[E] si no se puede borrar la foto igual responde el 409 y lo deja en el log', async () => {
      const logs = capturarLogs();
      await registrar(app).expect(201);
      cloudinaryFalso.borrar.mockRejectedValueOnce(new Error('caído'));

      const { body } = await registrar(
        app,
        usuarioValido({ nombreUsuario: 'otra_pers' }),
        foto,
      ).expect(409);

      expect(body.codigo).toBe('CORREO_REPETIDO');
      expect(logs).toContainEqual(
        expect.objectContaining({
          evento: 'imagen_no_borrada',
          nivel: 'warn',
          public_id: PUBLIC_ID_IMAGEN_SUBIDA,
          motivo: 'caído',
        }),
      );
    });
  });

  describe('alta por un administrador', () => {
    it('[I] con el correo repetido responde 409 y borra la foto subida', async () => {
      const sesion = await registrarYObtenerSesion(app);
      const token = tokenDeAdministrador(sesion.usuario._id);

      const { body } = await crearUsuario(
        app,
        token,
        usuarioValido({ nombreUsuario: 'otra_pers', perfil: 'usuario' }),
        foto,
      ).expect(409);

      expect(body.codigo).toBe('CORREO_REPETIDO');
      expect(cloudinaryFalso.borrar).toHaveBeenCalledTimes(1);
      expect(await imagenes.countDocuments()).toBe(0);
    });
  });

  describe('alta con Google', () => {
    const perfilGoogle = {
      id: 'google-1',
      correo: 'laura@correo.com',
      correoVerificado: true,
      nombre: 'Laura',
      apellido: 'Carelli',
    };

    const fotoDeGoogle = {
      buffer: PNG,
      mimetype: 'image/png',
      size: PNG.length,
    } as Express.Multer.File;

    it('[E] si no se puede crear la cuenta borra la foto copiada', async () => {
      vi.spyOn(usuarios, 'create').mockRejectedValueOnce(
        new Error('base caída') as never,
      );

      await expect(
        app
          .get(UsuariosService)
          .crearDesdeGoogle(perfilGoogle, 'usuario', fotoDeGoogle),
      ).rejects.toThrow('base caída');

      expect(cloudinaryFalso.borrar).toHaveBeenCalledExactlyOnceWith(
        PUBLIC_ID_IMAGEN_SUBIDA,
      );
      expect(await imagenes.countDocuments()).toBe(0);
    });

    it('[S] si la cuenta se crea conserva la foto copiada', async () => {
      await app
        .get(UsuariosService)
        .crearDesdeGoogle(perfilGoogle, 'usuario', fotoDeGoogle);

      expect(cloudinaryFalso.borrar).not.toHaveBeenCalled();
      expect(await imagenes.countDocuments()).toBe(1);
    });
  });
});
