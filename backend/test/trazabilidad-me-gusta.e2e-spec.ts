import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import request from 'supertest';
import { EventoMeGusta } from '../src/publicaciones/schemas/evento-me-gusta.schema.js';
import { MeGusta } from '../src/publicaciones/schemas/me-gusta.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrar,
  registrarYObtenerSesion,
  usuarioValido,
} from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';
import { tokenDeAdministrador } from './ayudas/sesiones.js';

type Linea = Record<string, unknown>;

describe('trazabilidad de me gusta', () => {
  let app: INestApplication;
  let eventos: Model<EventoMeGusta>;
  let megusta: Model<MeGusta>;
  let tokenLaura: string;
  let lauraId: string;
  let tokenJuan: string;
  let juanId: string;
  let publicacionId: string;
  let lineas: Linea[];

  const lineasDe = (evento: string) =>
    lineas.filter((linea) => linea.evento === evento);

  const dar = (token = tokenLaura, id = publicacionId) =>
    request(app.getHttpServer())
      .post(`/publicaciones/${id}/megusta`)
      .set('Authorization', `Bearer ${token}`);

  const quitar = (token = tokenLaura, id = publicacionId) =>
    request(app.getHttpServer())
      .delete(`/publicaciones/${id}/megusta`)
      .set('Authorization', `Bearer ${token}`);

  const historial = () => eventos.find().sort({ fecha: 1, _id: 1 }).lean();

  beforeAll(async () => {
    app = await crearApp();
    eventos = app.get(getModelToken(EventoMeGusta.name));
    megusta = app.get(getModelToken(MeGusta.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const laura = await registrarYObtenerSesion(app);
    const juan = await registrarYObtenerSesion(app, {
      correo: 'juan@correo.com',
      nombreUsuario: 'juan_p',
    });
    tokenLaura = laura.token;
    lauraId = laura.usuario._id;
    tokenJuan = juan.token;
    juanId = juan.usuario._id;
    publicacionId = (await sembrarPublicaciones(app, juanId, 1))[0].id;

    lineas = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
      for (const linea of String(texto).split('\n')) {
        if (linea.startsWith('{')) {
          lineas.push(JSON.parse(linea) as Linea);
        }
      }
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('eventos guardados en la base', () => {
    it('[O] dar me gusta deja un evento con quién, a qué, de quién, cuándo y cuántos había', async () => {
      const antes = Date.now();

      await dar().expect(201);

      const [evento] = await historial();
      expect(evento).toMatchObject({
        tipo: 'dado',
        nombreUsuario: 'laura_c',
        tituloPublicacion: 'Título 1',
        nombreAutor: 'juan_p',
        cantidadMeGusta: 1,
      });
      expect(String(evento.usuario)).toBe(lauraId);
      expect(String(evento.publicacion)).toBe(publicacionId);
      expect(String(evento.autor)).toBe(juanId);
      expect(evento.fecha.getTime()).toBeGreaterThanOrEqual(antes - 1000);
      expect(evento.fecha.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('[O] quitar el me gusta deja otro evento y el historial conserva el que se había dado', async () => {
      await dar().expect(201);
      await quitar().expect(204);

      const historia = await historial();

      expect(historia.map(({ tipo }) => tipo)).toEqual(['dado', 'quitado']);
      expect(historia.map(({ cantidadMeGusta }) => cantidadMeGusta)).toEqual([
        1, 0,
      ]);
      expect(await megusta.countDocuments()).toBe(0);
    });

    it('[M] dar, quitar y volver a dar quedan en orden, con el mismo dueño', async () => {
      await dar().expect(201);
      await quitar().expect(204);
      await dar().expect(201);

      const historia = await historial();

      expect(historia.map(({ tipo }) => tipo)).toEqual([
        'dado',
        'quitado',
        'dado',
      ]);
      expect(new Set(historia.map(({ usuario }) => String(usuario))).size).toBe(
        1,
      );
    });

    it('[M] con dos personas, cada evento dice quién fue y cuántos había en ese momento', async () => {
      await dar(tokenLaura).expect(201);
      await dar(tokenJuan).expect(201);

      const historia = await historial();

      expect(historia.map(({ nombreUsuario }) => nombreUsuario)).toEqual([
        'laura_c',
        'juan_p',
      ]);
      expect(historia.map(({ cantidadMeGusta }) => cantidadMeGusta)).toEqual([
        1, 2,
      ]);
    });

    it('[E] lo que se rechaza no deja evento: repetido, inexistente o sin haberlo dado', async () => {
      await dar().expect(201);
      await dar().expect(409);
      await dar(tokenLaura, '64b64b64b64b64b64b64b64b').expect(404);
      await quitar(tokenJuan).expect(404);
      await quitar(tokenLaura, '64b64b64b64b64b64b64b64b').expect(404);

      expect(await eventos.countDocuments()).toBe(1);
    });

    it('[M] los eventos guardan los nombres tal como eran, aunque después cambie algo', async () => {
      await dar().expect(201);
      const publicaciones = app.get<Model<Publicacion>>(
        getModelToken(Publicacion.name),
      );
      await publicaciones.updateOne({ _id: publicacionId }, { titulo: 'Otro' });

      const [evento] = await historial();

      expect(evento.tituloPublicacion).toBe('Título 1');
    });
  });

  describe('si falla el guardado del evento', () => {
    it('[S] el me gusta se guarda igual y queda un log de error con el motivo', async () => {
      vi.spyOn(eventos, 'create').mockRejectedValueOnce(
        new Error('base caída') as never,
      );

      const { body } = await dar().expect(201);

      expect(body).toEqual({ meGusta: true, cantidadMeGusta: 1 });
      expect(await megusta.countDocuments()).toBe(1);
      const [error] = lineasDe('evento_me_gusta_no_registrado');
      expect(error).toMatchObject({
        nivel: 'error',
        tipo: 'dado',
        id_publicacion: publicacionId,
        id_usuario: lauraId,
        motivo: 'base caída',
      });
    });
  });

  describe('logs', () => {
    it('[O] me_gusta_dado trae quién (id y nombre), de quién es la publicación y cuántos hay', async () => {
      await dar().expect(201);

      const [linea] = lineasDe('me_gusta_dado');

      expect(linea).toMatchObject({
        nivel: 'info',
        modulo: 'PublicacionesService',
        id_publicacion: publicacionId,
        id_usuario: lauraId,
        nombre_usuario: 'laura_c',
        id_autor: juanId,
        nombre_autor: 'juan_p',
        cantidad_me_gusta: 1,
      });
      expect(typeof linea.id_solicitud).toBe('string');
      expect(Number.isNaN(Date.parse(String(linea.timestamp)))).toBe(false);
    });

    it('[O] me_gusta_quitado trae los mismos datos con la cantidad que quedó', async () => {
      await dar().expect(201);
      await quitar().expect(204);

      const [linea] = lineasDe('me_gusta_quitado');

      expect(linea).toMatchObject({
        id_usuario: lauraId,
        nombre_usuario: 'laura_c',
        nombre_autor: 'juan_p',
        cantidad_me_gusta: 0,
      });
    });

    it('[I] la línea del evento y la HTTP comparten id_solicitud, y la HTTP también trae el nombre', async () => {
      await dar().expect(201);

      const [evento] = lineasDe('me_gusta_dado');
      const http = lineasDe('solicitud_exitosa').find(
        (linea) => linea.id_solicitud === evento.id_solicitud,
      );

      expect(http).toMatchObject({
        metodo: 'POST',
        estado_http: 201,
        id_usuario: lauraId,
        nombre_usuario: 'laura_c',
      });
    });

    it('[I] publicacion_eliminada dice quién eliminó, de quién era y si fue un administrador', async () => {
      await request(app.getHttpServer())
        .delete(`/publicaciones/${publicacionId}`)
        .set('Authorization', `Bearer ${tokenDeAdministrador(lauraId)}`)
        .expect(204);

      const [linea] = lineasDe('publicacion_eliminada');

      expect(linea).toMatchObject({
        id_publicacion: publicacionId,
        id_usuario: lauraId,
        nombre_usuario: 'laura_c',
        id_autor: juanId,
        nombre_autor: 'juan_p',
        por_administrador: true,
      });
    });

    it('[I] publicacion_creada trae el nombre de quien publica y el tipo', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', `Bearer ${tokenLaura}`)
        .field('tipo', 'tip')
        .field('titulo', 'Hola')
        .field('mensaje', 'Texto')
        .expect(201);

      const [linea] = lineasDe('publicacion_creada');

      expect(linea).toMatchObject({
        id_usuario: lauraId,
        nombre_usuario: 'laura_c',
        tipo: 'tip',
      });
    });

    it('[I] el registro y el ingreso también dejan el nombre de usuario', async () => {
      await registrar(
        app,
        usuarioValido({ correo: 'ana@correo.com', nombreUsuario: 'ana_g' }),
      ).expect(201);
      await request(app.getHttpServer())
        .post('/auth/ingresar')
        .send({ identificador: 'ana_g', clave: 'Clave1234' })
        .expect(200);

      expect(lineasDe('usuario_registrado')[0].nombre_usuario).toBe('ana_g');
      expect(lineasDe('ingreso_correcto')[0].nombre_usuario).toBe('ana_g');
    });
  });

  describe('token', () => {
    it('[O] trae el nombre de usuario y lo conserva al renovarse', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/refrescar')
        .set('Authorization', `Bearer ${tokenLaura}`)
        .expect(200);

      const original = jwt.decode(tokenLaura) as Record<string, unknown>;
      const renovado = jwt.decode(body.token) as Record<string, unknown>;
      expect(original.nombreUsuario).toBe('laura_c');
      expect(renovado.nombreUsuario).toBe('laura_c');
    });

    it('[B] un token de antes de este cambio, sin nombre, sigue funcionando y el nombre sale de la base', async () => {
      const viejo = jwt.sign(
        { sub: lauraId, perfil: 'usuario' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' },
      );

      await dar(viejo).expect(201);

      const [linea] = lineasDe('me_gusta_dado');
      expect(linea.nombre_usuario).toBe('laura_c');
      expect((await historial())[0].nombreUsuario).toBe('laura_c');
    });
  });
});
