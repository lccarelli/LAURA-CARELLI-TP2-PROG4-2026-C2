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
  crearUsuario,
  pngDeTamano,
  registrarYObtenerSesion,
  usuarioValido,
} from './ayudas/datos.js';
import { capturarLogs } from './ayudas/logs.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

describe('POST /usuarios', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;
  let tokenAdministrador: string;
  let tokenComun: string;

  const nuevo = (cambios: Record<string, string> = {}) =>
    usuarioValido({
      correo: 'nueva@correo.com',
      nombreUsuario: 'nueva_p',
      perfil: 'usuario',
      ...cambios,
    });

  const imagenPng = {
    contenido: PNG,
    nombre: 'foto.png',
    tipo: 'image/png',
  };

  beforeAll(async () => {
    app = await crearApp();
    usuarios = app.get(getModelToken(Usuario.name));
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

  describe('el alta', () => {
    it('[O] un administrador crea una persona con perfil usuario y responde 201', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo(),
      ).expect(201);

      expect(body).toMatchObject({
        nombre: 'Laura',
        correo: 'nueva@correo.com',
        nombreUsuario: 'nueva_p',
        perfil: 'usuario',
        habilitado: true,
      });
    });

    it('[O] puede crear una persona con perfil administrador', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ perfil: 'administrador' }),
      ).expect(201);

      expect(body.perfil).toBe('administrador');
    });

    it('[S] no devuelve token ni clave: la sesión sigue siendo la del administrador', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo(),
      ).expect(201);

      expect(body).not.toHaveProperty('token');
      expect(body).not.toHaveProperty('clave');
    });

    it('[S] guarda la clave hasheada', async () => {
      await crearUsuario(app, tokenAdministrador, nuevo()).expect(201);

      const guardado = await usuarios
        .findOne({ nombreUsuario: 'nueva_p' })
        .select('+clave')
        .lean();

      expect(guardado!.clave).not.toBe('Clave1234');
      expect(await bcrypt.compare('Clave1234', guardado!.clave)).toBe(true);
    });

    it('[S] la persona creada puede ingresar con su clave', async () => {
      await crearUsuario(app, tokenAdministrador, nuevo()).expect(201);

      const { body } = await request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador: 'nueva@correo.com', clave: 'Clave1234' })
        .expect(200);

      expect(body.usuario.perfil).toBe('usuario');
    });

    it('[S] la persona creada con perfil administrador entra como administrador', async () => {
      await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ perfil: 'administrador' }),
      ).expect(201);

      const { body } = await request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador: 'nueva_p', clave: 'Clave1234' })
        .expect(200);

      expect(body.usuario.perfil).toBe('administrador');
    });

    it('[S] aparece primera en el listado de usuarios', async () => {
      await crearUsuario(app, tokenAdministrador, nuevo()).expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer ${tokenAdministrador}`)
        .expect(200);

      expect(body.datos[0].nombreUsuario).toBe('nueva_p');
    });

    it('[B] el correo se guarda en minúsculas', async () => {
      await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ correo: 'NUEVA@Correo.com' }),
      ).expect(201);

      expect(
        await usuarios.countDocuments({ correo: 'nueva@correo.com' }),
      ).toBe(1);
    });
  });

  describe('trazabilidad', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('[S] registra quién creó a quién y con qué perfil, sin la clave', async () => {
      const lineas = capturarLogs();

      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ perfil: 'administrador' }),
      ).expect(201);

      const creado = lineas.find((linea) => linea.evento === 'usuario_creado');
      expect(creado).toMatchObject({
        id_usuario: body._id,
        nombre_usuario: 'nueva_p',
        perfil: 'administrador',
      });
      expect(creado!.id_administrador).toEqual(expect.any(String));
      expect(JSON.stringify(lineas)).not.toContain('Clave1234');
    });
  });

  describe('la foto', () => {
    it('[S] con imagen guarda la URL que devuelve el almacenamiento', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo(),
        imagenPng,
      ).expect(201);

      expect(body.imagenPerfil).toBe(URL_IMAGEN_SUBIDA);
      const [, destino, nombre] = cloudinaryFalso.subir.mock.calls[0];
      expect(destino).toBe(Destino.PERFILES);
      expect(nombre).toMatch(new RegExp(`^${body._id}-perfiles-\\d+$`));
    });

    it('[S] sin imagen no guarda imagenPerfil ni usa el almacenamiento', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo(),
      ).expect(201);

      expect(body.imagenPerfil).toBeUndefined();
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[B] una imagen de 2 MB más 1 byte responde 413 y no crea a nadie', async () => {
      await crearUsuario(app, tokenAdministrador, nuevo(), {
        ...imagenPng,
        contenido: pngDeTamano(2 * 1024 * 1024 + 1),
      }).expect(413);

      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[E] un archivo que no es imagen responde 400', async () => {
      await crearUsuario(app, tokenAdministrador, nuevo(), {
        contenido: Buffer.from('texto plano'),
        nombre: 'nota.txt',
        tipo: 'text/plain',
      }).expect(400);

      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[E] si el almacenamiento falla responde 500 y no crea a nadie', async () => {
      cloudinaryFalso.subir.mockRejectedValueOnce(new Error('caído'));

      await crearUsuario(app, tokenAdministrador, nuevo(), imagenPng).expect(
        500,
      );

      expect(await usuarios.countDocuments()).toBe(1);
    });
  });

  describe('datos repetidos', () => {
    it('[M] un correo ya registrado responde 409 CORREO_REPETIDO', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ correo: 'laura@correo.com' }),
      ).expect(409);

      expect(body.codigo).toBe('CORREO_REPETIDO');
    });

    it('[M] un nombre de usuario ya registrado responde 409 USUARIO_REPETIDO', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ nombreUsuario: 'laura_c' }),
      ).expect(409);

      expect(body.codigo).toBe('USUARIO_REPETIDO');
    });

    it('[M] crear dos veces a la misma persona responde 409 la segunda', async () => {
      await crearUsuario(app, tokenAdministrador, nuevo()).expect(201);

      await crearUsuario(app, tokenAdministrador, nuevo()).expect(409);
    });
  });

  describe('validaciones', () => {
    it('[Z] sin datos responde 400 DATOS_INVALIDOS y no crea a nadie', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/usuarios')
        .set('Authorization', `Bearer ${tokenAdministrador}`)
        .expect(400);

      expect(body.codigo).toBe('DATOS_INVALIDOS');
      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[I] sin perfil responde 400', async () => {
      const sinPerfil: Record<string, string> = nuevo();
      delete sinPerfil.perfil;

      await crearUsuario(app, tokenAdministrador, sinPerfil).expect(400);
    });

    it('[I] un perfil que no existe responde 400', async () => {
      await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ perfil: 'superadmin' }),
      ).expect(400);

      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[I] un campo desconocido responde 400', async () => {
      await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ habilitado: 'false' }),
      ).expect(400);
    });

    it('[B] una clave débil responde 400', async () => {
      await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ clave: 'corta' }),
      ).expect(400);
    });

    it('[B] una fecha de nacimiento futura responde 400 FECHA_FUTURA', async () => {
      const { body } = await crearUsuario(
        app,
        tokenAdministrador,
        nuevo({ fechaNacimiento: '2999-01-01' }),
      ).expect(400);

      expect(body.codigo).toBe('FECHA_FUTURA');
    });
  });

  describe('permisos', () => {
    it('[E] una persona común responde 403 NO_ES_ADMINISTRADOR y no crea a nadie', async () => {
      const { body } = await crearUsuario(app, tokenComun, nuevo()).expect(403);

      expect(body.codigo).toBe('NO_ES_ADMINISTRADOR');
      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[E] una persona común no puede crearse un administrador', async () => {
      await crearUsuario(
        app,
        tokenComun,
        nuevo({ perfil: 'administrador' }),
      ).expect(403);

      expect(await usuarios.countDocuments({ perfil: 'administrador' })).toBe(
        0,
      );
    });

    it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/usuarios')
        .field('perfil', 'usuario')
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
    });
  });
});
