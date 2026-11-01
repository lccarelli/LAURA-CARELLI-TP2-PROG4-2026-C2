import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import request from 'supertest';
import { Destino } from '../src/imagenes/destinos.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, cloudinaryFalso, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  URL_IMAGEN_SUBIDA,
  pngDeTamano,
  registrar,
  usuarioValido,
} from './ayudas/datos.js';

describe('POST /auth/registro', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;

  beforeAll(async () => {
    app = await crearApp();
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const imagenPng = {
    contenido: PNG,
    nombre: 'foto.png',
    tipo: 'image/png',
  };

  describe('sin datos', () => {
    it('[Z] sin body responde 400 y avisa de cada campo faltante', async () => {
      const respuesta = await request(app.getHttpServer())
        .post('/auth/registro')
        .expect(400);

      const mensajes: string[] = respuesta.body.message;
      for (const campo of [
        'nombre',
        'apellido',
        'correo',
        'nombreUsuario',
        'clave',
        'fechaNacimiento',
        'descripcion',
      ]) {
        expect(mensajes.some((mensaje) => mensaje.includes(campo))).toBe(true);
      }
    });

    it('[Z] después de un 400 no queda ningún usuario', async () => {
      await registrar(app, usuarioValido({ clave: 'corta' })).expect(400);

      expect(await usuarios.countDocuments()).toBe(0);
    });
  });

  describe('un registro', () => {
    it('[O] con datos válidos responde 201', async () => {
      await registrar(app).expect(201);
    });

    it('[O] guarda el usuario con la clave hasheada', async () => {
      await registrar(app).expect(201);

      const guardado = await usuarios.findOne().select('+clave');
      expect(guardado!.correo).toBe('laura@correo.com');
      expect(guardado!.clave).not.toBe('Clave1234');
      expect(await bcrypt.compare('Clave1234', guardado!.clave)).toBe(true);
    });

    it('[O] responde con el token y el usuario sin la clave', async () => {
      const respuesta = await registrar(app).expect(201);

      expect(typeof respuesta.body.token).toBe('string');
      expect(respuesta.body.usuario.nombreUsuario).toBe('laura_c');
      expect(respuesta.body.usuario.clave).toBeUndefined();
    });
  });

  describe('varios registros', () => {
    it('[M] dos usuarios distintos se registran', async () => {
      await registrar(app).expect(201);
      await registrar(
        app,
        usuarioValido({ correo: 'juan@correo.com', nombreUsuario: 'juan_p' }),
      ).expect(201);

      expect(await usuarios.countDocuments()).toBe(2);
    });

    it('[M] el mismo correo responde 409', async () => {
      await registrar(app).expect(201);

      const respuesta = await registrar(
        app,
        usuarioValido({ nombreUsuario: 'otra_pers' }),
      ).expect(409);

      expect(respuesta.body.message).toContain('correo');
      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[M] el mismo nombre de usuario responde 409', async () => {
      await registrar(app).expect(201);

      const respuesta = await registrar(
        app,
        usuarioValido({ correo: 'otra@correo.com' }),
      ).expect(409);

      expect(respuesta.body.message).toContain('nombre de usuario');
    });
  });

  describe('bordes', () => {
    it('[B] el correo en mayúsculas choca con el mismo en minúsculas', async () => {
      await registrar(app).expect(201);

      await registrar(
        app,
        usuarioValido({
          correo: 'LAURA@correo.com',
          nombreUsuario: 'otra_pers',
        }),
      ).expect(409);
    });

    it('[B] el correo se guarda en minúsculas', async () => {
      await registrar(
        app,
        usuarioValido({ correo: 'LAURA@Correo.com' }),
      ).expect(201);

      expect((await usuarios.findOne())!.correo).toBe('laura@correo.com');
    });

    it('[B] los espacios alrededor del correo se descartan', async () => {
      await registrar(
        app,
        usuarioValido({ correo: '  laura@correo.com  ' }),
      ).expect(201);

      expect((await usuarios.findOne())!.correo).toBe('laura@correo.com');
    });

    it('[B] una fecha de nacimiento futura responde 400', async () => {
      await registrar(
        app,
        usuarioValido({ fechaNacimiento: '2999-01-01' }),
      ).expect(400);
    });

    it('[B] una imagen de 2 MB exactos se acepta', async () => {
      await registrar(app, usuarioValido(), {
        ...imagenPng,
        contenido: pngDeTamano(2 * 1024 * 1024),
      }).expect(201);
    });

    it('[B] una imagen de 2 MB más 1 byte se rechaza', async () => {
      await registrar(app, usuarioValido(), {
        ...imagenPng,
        contenido: pngDeTamano(2 * 1024 * 1024 + 1),
      }).expect(413);

      expect(await usuarios.countDocuments()).toBe(0);
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });
  });

  describe('contrato', () => {
    it('[I] el campo perfil en el body responde 400', async () => {
      await registrar(app, usuarioValido({ perfil: 'administrador' })).expect(
        400,
      );

      expect(await usuarios.countDocuments()).toBe(0);
    });

    it('[I] un campo desconocido responde 400', async () => {
      await registrar(app, usuarioValido({ extra: 'x' })).expect(400);
    });

    it('[I] el usuario creado tiene perfil usuario y está habilitado', async () => {
      const respuesta = await registrar(app).expect(201);

      expect(respuesta.body.usuario.perfil).toBe('usuario');
      expect(respuesta.body.usuario.habilitado).toBe(true);
    });
  });

  describe('errores', () => {
    it('[E] un archivo que no es imagen responde 400', async () => {
      await registrar(app, usuarioValido(), {
        contenido: Buffer.from('texto plano'),
        nombre: 'nota.txt',
        tipo: 'text/plain',
      }).expect(400);

      expect(await usuarios.countDocuments()).toBe(0);
    });

    it('[E] un archivo que dice ser imagen pero no lo es responde 400', async () => {
      await registrar(app, usuarioValido(), {
        contenido: Buffer.from('texto plano'),
        nombre: 'falsa.png',
        tipo: 'image/png',
      }).expect(400);
    });
  });

  describe('escenarios simples', () => {
    it('[S] el correo de ADMIN_EMAIL queda con perfil administrador', async () => {
      const respuesta = await registrar(
        app,
        usuarioValido({ correo: 'admin@prueba.com' }),
      ).expect(201);

      expect(respuesta.body.usuario.perfil).toBe('administrador');
    });

    it('[S] con imagen, el usuario guarda la URL que devuelve el almacenamiento', async () => {
      const registro = await registrar(app, usuarioValido(), imagenPng).expect(
        201,
      );

      expect(registro.body.usuario.imagenPerfil).toBe(URL_IMAGEN_SUBIDA);
      expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(1);
      const [archivo, destino, nombre] = cloudinaryFalso.subir.mock.calls[0];
      expect(destino).toBe(Destino.PERFILES);
      expect(nombre).toMatch(
        new RegExp(`^${registro.body.usuario._id}-perfiles-\\d+$`),
      );
      expect(archivo.mimetype).toBe('image/png');
      expect(archivo.buffer).toEqual(PNG);
    });

    it('[S] sin imagen, el usuario no tiene imagenPerfil', async () => {
      const respuesta = await registrar(app).expect(201);

      expect(respuesta.body.usuario.imagenPerfil).toBeUndefined();
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });
  });

  describe('almacenamiento caído', () => {
    it('[E] si Cloudinary falla responde 500 y no crea el usuario', async () => {
      cloudinaryFalso.subir.mockRejectedValueOnce(new Error('caído'));

      await registrar(app, usuarioValido(), imagenPng).expect(500);

      expect(await usuarios.countDocuments()).toBe(0);
    });
  });
});
