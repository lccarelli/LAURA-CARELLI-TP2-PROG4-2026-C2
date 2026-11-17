import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Destino } from '../src/imagenes/destinos.js';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import {
  enviarFormulario,
  PNG,
  pngDeTamano,
  registrarYObtenerSesion,
  URL_IMAGEN_SUBIDA,
} from './ayudas/datos.js';
import { capturarLogs } from './ayudas/logs.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

const CAMBIOS = {
  nombre: 'Ana',
  apellido: 'Gómez',
  descripcion: 'Cocino los domingos',
};

describe('PUT /usuarios/yo', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;

  const editar = (
    campos: Record<string, string> = CAMBIOS,
    archivo?: { contenido: Buffer; nombre: string; tipo: string },
    conToken: string | null = token,
  ) => {
    const solicitud = request(app.getHttpServer()).put('/usuarios/yo');
    if (conToken) {
      solicitud.set('Authorization', `Bearer ${conToken}`);
    }
    return enviarFormulario(solicitud, campos, archivo);
  };
  const foto = { contenido: PNG, nombre: 'foto.png', tipo: 'image/png' };

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    token = sesion.token;
    usuarioId = sesion.usuario._id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('cambios', () => {
    it('[O] cambia nombre, apellido y descripción, y responde el usuario actualizado', async () => {
      const { body } = await editar().expect(200);

      expect(body).toMatchObject({ _id: usuarioId, ...CAMBIOS });
      expect(body.clave).toBeUndefined();
    });

    it('[I] no toca el correo, el usuario, el perfil, la fecha ni si está habilitado', async () => {
      const { body } = await editar().expect(200);

      expect(body).toMatchObject({
        correo: 'laura@correo.com',
        nombreUsuario: 'laura_c',
        perfil: 'usuario',
        habilitado: true,
      });
      expect(body.fechaNacimiento).toMatch(/^1990-05-20/);
    });

    it('[S] con foto nueva guarda la URL que devuelve el almacenamiento', async () => {
      const { body } = await editar(CAMBIOS, foto).expect(200);

      expect(body.imagenPerfil).toBe(URL_IMAGEN_SUBIDA);
      expect(cloudinaryFalso.subir).toHaveBeenCalledWith(
        expect.anything(),
        Destino.PERFILES,
        expect.any(String),
      );
    });

    it('[S] sin foto en el pedido conserva la que ya tenía', async () => {
      await editar(CAMBIOS, foto).expect(200);

      const { body } = await editar({ ...CAMBIOS, nombre: 'Ani' }).expect(200);

      expect(body.imagenPerfil).toBe(URL_IMAGEN_SUBIDA);
    });

    it('[S] quitarImagen=true borra la foto', async () => {
      await editar(CAMBIOS, foto).expect(200);

      const { body } = await editar({
        ...CAMBIOS,
        quitarImagen: 'true',
      }).expect(200);

      expect(body.imagenPerfil).toBeUndefined();
    });

    it('[S] una foto nueva gana sobre quitarImagen', async () => {
      const { body } = await editar(
        { ...CAMBIOS, quitarImagen: 'true' },
        foto,
      ).expect(200);

      expect(body.imagenPerfil).toBe(URL_IMAGEN_SUBIDA);
    });

    it('[S] los espacios de alrededor se recortan', async () => {
      const { body } = await editar({
        ...CAMBIOS,
        nombre: '  Ana  ',
      }).expect(200);

      expect(body.nombre).toBe('Ana');
    });

    it('[S] las publicaciones ya hechas muestran el nombre nuevo', async () => {
      const [publicacion] = await sembrarPublicaciones(app, usuarioId, 1);

      await editar().expect(200);

      const { body } = await request(app.getHttpServer())
        .get(`/publicaciones/${publicacion.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(body.usuario.nombre).toBe('Ana');
    });

    it('[S] registra quién editó su perfil', async () => {
      const lineas = capturarLogs();

      await editar().expect(200);

      expect(
        lineas.find((linea) => linea.evento === 'usuario_editado'),
      ).toMatchObject({ id_usuario: usuarioId, nombre_usuario: 'laura_c' });
    });
  });

  describe('errores', () => {
    it.each([
      ['sin nombre', { apellido: 'G', descripcion: 'd' }],
      ['nombre de 1 letra', { ...CAMBIOS, nombre: 'A' }],
      ['nombre de 31 letras', { ...CAMBIOS, nombre: 'A'.repeat(31) }],
      ['sin apellido', { nombre: 'Ana', descripcion: 'd' }],
      ['sin descripción', { nombre: 'Ana', apellido: 'Gómez' }],
      ['descripción vacía', { ...CAMBIOS, descripcion: '   ' }],
      ['descripción de 201', { ...CAMBIOS, descripcion: 'a'.repeat(201) }],
      ['quitarImagen inválido', { ...CAMBIOS, quitarImagen: 'quizás' }],
      ['correo en el cuerpo', { ...CAMBIOS, correo: 'otro@correo.com' }],
      ['nombreUsuario en el cuerpo', { ...CAMBIOS, nombreUsuario: 'otro' }],
      ['perfil en el cuerpo', { ...CAMBIOS, perfil: 'administrador' }],
      ['clave en el cuerpo', { ...CAMBIOS, clave: 'Clave1234' }],
    ])('[E] %s responde 400', async (_caso, campos) => {
      await editar(campos).expect(400);
    });

    it.each([
      [
        'un archivo que no es imagen',
        {
          contenido: Buffer.from('texto'),
          nombre: 'a.txt',
          tipo: 'text/plain',
        },
        400,
      ],
      [
        'una imagen de más de 2 MB',
        {
          contenido: pngDeTamano(2 * 1024 * 1024 + 1),
          nombre: 'g.png',
          tipo: 'image/png',
        },
        413,
      ],
    ])('[E] %s se rechaza y no cambia nada', async (_caso, archivo, estado) => {
      await editar(CAMBIOS, archivo).expect(estado);

      const { body } = await request(app.getHttpServer())
        .post('/auth/autorizar')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(body.usuario.nombre).toBe('Laura');
    });

    it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
      const { body } = await editar(CAMBIOS, undefined, null).expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
    });

    it('[E] con un token inválido responde 401', async () => {
      await editar(CAMBIOS, undefined, 'falso').expect(401);
    });
  });
});
