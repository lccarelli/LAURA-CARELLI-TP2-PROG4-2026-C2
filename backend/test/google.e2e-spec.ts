import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { ClienteGoogle } from '../src/auth/cliente-google.js';
import type { PerfilGoogle } from '../src/auth/cliente-google.js';
import { Ingreso } from '../src/auth/schemas/ingreso.schema.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  URL_IMAGEN_SUBIDA,
  registrar,
  usuarioValido,
} from './ayudas/datos.js';

const FOTO = {
  fieldname: 'imagen',
  originalname: 'google.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: PNG.length,
  buffer: PNG,
} as Express.Multer.File;

const LAURA: PerfilGoogle = {
  id: 'google-123',
  correo: 'laura.carelli@gmail.com',
  correoVerificado: true,
  nombre: 'Laura',
  apellido: 'Carelli',
  foto: 'https://lh3.googleusercontent.com/a/foto',
};

describe('POST /auth/google', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;
  let ingresos: Model<Ingreso>;
  const clienteFalso = {
    habilitado: true,
    verificar: vi.fn<(credencial: string) => Promise<PerfilGoogle | null>>(),
    descargarFoto:
      vi.fn<(url?: string) => Promise<Express.Multer.File | null>>(),
  };

  const ingresarConGoogle = (
    credencial: unknown = 'credencial-de-google-de-prueba',
  ) => request(app.getHttpServer()).post('/auth/google').send({ credencial });

  beforeAll(async () => {
    app = await crearApp(false, (constructor) =>
      constructor.overrideProvider(ClienteGoogle).useValue(clienteFalso),
    );
    usuarios = app.get(getModelToken(Usuario.name));
    ingresos = app.get(getModelToken(Ingreso.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    clienteFalso.habilitado = true;
    clienteFalso.verificar.mockReset().mockResolvedValue(LAURA);
    clienteFalso.descargarFoto.mockReset().mockResolvedValue(FOTO);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('la primera vez (crea la cuenta)', () => {
    it('[O] crea la cuenta con los datos de Google y devuelve la sesión', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      expect(body.token).toEqual(expect.any(String));
      expect(body.usuario).toMatchObject({
        nombre: 'Laura',
        apellido: 'Carelli',
        correo: 'laura.carelli@gmail.com',
        nombreUsuario: 'laura_carelli',
        perfil: 'usuario',
        habilitado: true,
      });
      expect(await usuarios.countDocuments()).toBe(1);
    });

    it('[S] la fecha de nacimiento y la descripción quedan vacías: son opcionales para las cuentas de Google', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.fechaNacimiento).toBeUndefined();
      expect(body.usuario.descripcion).toBeUndefined();
    });

    it('[I] copia la foto de Google a nuestro Cloudinary y guarda esa dirección, no la de Google', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      expect(clienteFalso.descargarFoto).toHaveBeenCalledWith(LAURA.foto);
      expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(1);
      expect(body.usuario.imagenPerfil).toBe(URL_IMAGEN_SUBIDA);
    });

    it('[I] nunca muestra la clave ni el identificador de Google', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.clave).toBeUndefined();
      expect(body.usuario.googleId).toBeUndefined();
      const guardado = await usuarios
        .findOne()
        .select('+clave +googleId')
        .lean();
      expect(guardado!.googleId).toBe('google-123');
      expect(guardado!.clave).toMatch(/^\$2[aby]\$/);
    });

    it('[S] la sesión sirve: con el token se accede a las rutas protegidas', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      await request(app.getHttpServer())
        .post('/auth/autorizar')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
      await request(app.getHttpServer())
        .get('/publicaciones')
        .set('Authorization', `Bearer ${body.token}`)
        .expect(200);
    });

    it('[S] cuenta como un ingreso para las estadísticas', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      expect(await ingresos.countDocuments({ usuario: body.usuario._id })).toBe(
        1,
      );
    });

    it('[S] la clave que se genera es desconocida: con el correo y una clave inventada no se entra', async () => {
      await ingresarConGoogle().expect(200);

      await request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador: 'laura.carelli@gmail.com', clave: 'Clave1234' })
        .expect(401);
    });

    it('[B] un correo de más de 30 caracteres (el registro no los admite) igual funciona con Google', async () => {
      clienteFalso.verificar.mockResolvedValue({
        ...LAURA,
        correo: 'una.persona.con.un.correo.largo@gmail.com',
      });

      await ingresarConGoogle().expect(200);
    });

    it('[B] sin apellido en Google crea la cuenta igual', async () => {
      clienteFalso.verificar.mockResolvedValue({
        ...LAURA,
        apellido: undefined,
      });

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.nombre).toBe('Laura');
      expect(body.usuario.apellido).toBeUndefined();
    });

    it('[B] sin nombre en Google usa la parte del correo antes de la @', async () => {
      clienteFalso.verificar.mockResolvedValue({
        ...LAURA,
        nombre: undefined,
        apellido: undefined,
      });

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.nombre).toBe('laura_carelli');
    });

    it('[S] si el nombre de usuario ya está ocupado, agrega un número', async () => {
      await registrar(
        app,
        usuarioValido({
          nombreUsuario: 'laura_carelli',
          correo: 'otra@correo.com',
        }),
      ).expect(201);

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.nombreUsuario).toBe('laura_carelli1');
    });

    it('[S] con varias personas que empiezan igual, cada una queda con el suyo', async () => {
      clienteFalso.verificar.mockResolvedValueOnce(LAURA);
      clienteFalso.verificar.mockResolvedValueOnce({
        ...LAURA,
        id: 'g2',
        correo: 'laura.carelli@hotmail.com',
      });
      clienteFalso.verificar.mockResolvedValueOnce({
        ...LAURA,
        id: 'g3',
        correo: 'laura.carelli@yahoo.com',
      });

      const nombres = [];
      for (let i = 0; i < 3; i++) {
        nombres.push(
          (await ingresarConGoogle().expect(200)).body.usuario.nombreUsuario,
        );
      }

      expect(nombres).toEqual([
        'laura_carelli',
        'laura_carelli1',
        'laura_carelli2',
      ]);
    });

    it('[E] si no se puede bajar la foto, crea la cuenta sin foto', async () => {
      clienteFalso.descargarFoto.mockResolvedValue(null);

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.imagenPerfil).toBeUndefined();
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[E] si Cloudinary falla al guardar la foto, crea la cuenta sin foto', async () => {
      cloudinaryFalso.subir.mockRejectedValueOnce(
        new Error('Cloudinary caído'),
      );

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.imagenPerfil).toBeUndefined();
      expect(await usuarios.countDocuments()).toBe(1);
    });
  });

  describe('las veces siguientes', () => {
    it('[O] entra a la misma cuenta, sin crear otra ni volver a copiar la foto', async () => {
      const primera = await ingresarConGoogle().expect(200);
      cloudinaryFalso.subir.mockClear();

      const segunda = await ingresarConGoogle().expect(200);

      expect(segunda.body.usuario._id).toBe(primera.body.usuario._id);
      expect(await usuarios.countDocuments()).toBe(1);
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
      expect(await ingresos.countDocuments()).toBe(2);
    });

    it('[S] si cambia el correo en Google pero es la misma cuenta de Google (mismo id), entra a la misma', async () => {
      const primera = await ingresarConGoogle().expect(200);
      clienteFalso.verificar.mockResolvedValue({
        ...LAURA,
        correo: 'nuevo.correo@gmail.com',
      });

      const segunda = await ingresarConGoogle().expect(200);

      expect(segunda.body.usuario._id).toBe(primera.body.usuario._id);
    });

    it('[E] una cuenta deshabilitada no entra (403 USUARIO_DESHABILITADO)', async () => {
      await ingresarConGoogle().expect(200);
      await usuarios.updateOne({ correo: LAURA.correo }, { habilitado: false });

      const { body } = await ingresarConGoogle().expect(403);

      expect(body.codigo).toBe('USUARIO_DESHABILITADO');
    });
  });

  describe('si ya existía una cuenta con ese correo', () => {
    beforeEach(async () => {
      await registrar(
        app,
        usuarioValido({ correo: LAURA.correo, nombreUsuario: 'laura_c' }),
      ).expect(201);
    });

    it('[O] la vincula en vez de crear otra: es la misma persona', async () => {
      const antes = await usuarios.findOne({ correo: LAURA.correo }).lean();

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario._id).toBe(String(antes!._id));
      expect(body.usuario.nombreUsuario).toBe('laura_c');
      expect(await usuarios.countDocuments()).toBe(1);
      const vinculada = await usuarios.findOne().select('+googleId').lean();
      expect(vinculada!.googleId).toBe('google-123');
    });

    it('[S] conserva sus datos (fecha de nacimiento, descripción) y no copia la foto de Google', async () => {
      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.descripcion).toBe('Estudiante de programación');
      expect(body.usuario.fechaNacimiento).toBeDefined();
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });

    it('[S] después de vincularla sigue pudiendo ingresar con su correo y su clave', async () => {
      await ingresarConGoogle().expect(200);

      await request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador: 'laura_c', clave: 'Clave1234' })
        .expect(200);
    });

    it('[S] conserva su perfil: una cuenta de administrador sigue siéndolo', async () => {
      await usuarios.updateOne(
        { correo: LAURA.correo },
        { perfil: 'administrador' },
      );

      const { body } = await ingresarConGoogle().expect(200);

      expect(body.usuario.perfil).toBe('administrador');
    });
  });

  describe('rechazos', () => {
    it('[E] si Google no está configurado responde 404 GOOGLE_NO_DISPONIBLE', async () => {
      clienteFalso.habilitado = false;

      const { body } = await ingresarConGoogle().expect(404);

      expect(body.codigo).toBe('GOOGLE_NO_DISPONIBLE');
      expect(clienteFalso.verificar).not.toHaveBeenCalled();
    });

    it('[E] una credencial que Google no acepta responde 401 GOOGLE_CREDENCIAL_INVALIDA y no crea nada', async () => {
      clienteFalso.verificar.mockResolvedValue(null);

      const { body } = await ingresarConGoogle().expect(401);

      expect(body.codigo).toBe('GOOGLE_CREDENCIAL_INVALIDA');
      expect(await usuarios.countDocuments()).toBe(0);
    });

    it('[E] un correo que Google no verificó responde 401 GOOGLE_CORREO_NO_VERIFICADO y no crea ni vincula nada', async () => {
      await registrar(app, usuarioValido({ correo: LAURA.correo })).expect(201);
      clienteFalso.verificar.mockResolvedValue({
        ...LAURA,
        correoVerificado: false,
      });

      const { body } = await ingresarConGoogle().expect(401);

      expect(body.codigo).toBe('GOOGLE_CORREO_NO_VERIFICADO');
      expect(
        (await usuarios.findOne().select('+googleId').lean())!.googleId,
      ).toBeUndefined();
    });

    it.each([
      ['sin la credencial', {}],
      ['vacía', { credencial: '' }],
      ['demasiado corta', { credencial: 'abc' }],
      ['que no es texto', { credencial: 12345 }],
      ['demasiado larga', { credencial: 'a'.repeat(5000) }],
    ])('[E] %s responde 400 y no consulta a Google', async (_caso, cuerpo) => {
      await ingresarConGoogle(cuerpo).expect(400);

      expect(clienteFalso.verificar).not.toHaveBeenCalled();
    });
  });
});
