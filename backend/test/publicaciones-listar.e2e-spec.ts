import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';
import { TTL_LISTADO_MS } from '../src/publicaciones/publicaciones.module.js';

describe('GET /publicaciones', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;

  const listar = (consulta = '') =>
    request(app.getHttpServer())
      .get(`/publicaciones${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    token = sesion.token;
    usuarioId = sesion.usuario._id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('sin datos', () => {
    it('[Z] sin publicaciones devuelve la lista vacía y hayMas falso', async () => {
      const { body } = await listar().expect(200);

      expect(body.datos).toEqual([]);
      expect(body.hayMas).toBe(false);
    });
  });

  describe('una publicación', () => {
    it('[O] devuelve la publicación con su autor', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);

      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(1);
      expect(body.datos[0].titulo).toBe('Título 1');
      expect(body.datos[0].usuario.nombreUsuario).toBe('laura_c');
    });

    it('[O] devuelve los contadores de me gusta y comentarios', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);

      const { body } = await listar().expect(200);

      expect(body.datos[0].cantidadMeGusta).toBe(0);
      expect(body.datos[0].cantidadComentarios).toBe(0);
    });
  });

  describe('varias publicaciones', () => {
    it('[M] con 12 publicaciones, la primera página trae 10 y hayMas es verdadero', async () => {
      await sembrarPublicaciones(app, usuarioId, 12);

      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(10);
      expect(body.hayMas).toBe(true);
    });

    it('[M] con offset 10 trae las 2 restantes y hayMas es falso', async () => {
      await sembrarPublicaciones(app, usuarioId, 12);

      const { body } = await listar('?offset=10').expect(200);

      expect(body.datos).toHaveLength(2);
      expect(body.hayMas).toBe(false);
    });

    it('[M] ordena de la más reciente a la más antigua', async () => {
      await sembrarPublicaciones(app, usuarioId, 3);

      const { body } = await listar().expect(200);

      expect(body.datos.map((p: { titulo: string }) => p.titulo)).toEqual([
        'Título 3',
        'Título 2',
        'Título 1',
      ]);
    });

    it('[M] con la misma fecha, las páginas no repiten ni omiten', async () => {
      await sembrarPublicaciones(app, usuarioId, 12, true);

      const primera = await listar('?limit=5').expect(200);
      const segunda = await listar('?limit=5&offset=5').expect(200);
      const tercera = await listar('?limit=5&offset=10').expect(200);

      const ids = [primera, segunda, tercera].flatMap((pagina) =>
        pagina.body.datos.map((p: { _id: string }) => p._id),
      );
      expect(ids).toHaveLength(12);
      expect(new Set(ids).size).toBe(12);
      expect([...ids].sort().reverse()).toEqual(ids);
    });
  });

  describe('bordes', () => {
    it('[B] limit 1 y limit 50 funcionan', async () => {
      await sembrarPublicaciones(app, usuarioId, 3);

      await listar('?limit=1').expect(200);
      await listar('?limit=50').expect(200);
    });

    it('[B] limit 0 y limit 51 responden 400', async () => {
      await listar('?limit=0').expect(400);
      await listar('?limit=51').expect(400);
    });

    it('[B] offset -1 responde 400', async () => {
      await listar('?offset=-1').expect(400);
    });

    it('[B] un offset más allá del final devuelve la lista vacía', async () => {
      await sembrarPublicaciones(app, usuarioId, 3);

      const { body } = await listar('?offset=100').expect(200);

      expect(body.datos).toEqual([]);
      expect(body.hayMas).toBe(false);
    });

    it('[B] con exactamente limit publicaciones, hayMas es falso', async () => {
      await sembrarPublicaciones(app, usuarioId, 10);

      const { body } = await listar('?limit=10').expect(200);

      expect(body.datos).toHaveLength(10);
      expect(body.hayMas).toBe(false);
    });
  });

  describe('contrato', () => {
    it('[I] responde con datos, offset, limit y hayMas', async () => {
      const { body } = await listar('?offset=2&limit=5').expect(200);

      expect(Object.keys(body).sort()).toEqual([
        'datos',
        'hayMas',
        'limit',
        'offset',
      ]);
      expect(body.offset).toBe(2);
      expect(body.limit).toBe(5);
    });

    it('[I] el autor no incluye la clave ni el correo', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);

      const { body } = await listar().expect(200);

      expect(body.datos[0].usuario.clave).toBeUndefined();
      expect(body.datos[0].usuario.correo).toBeUndefined();
    });
  });

  describe('errores', () => {
    it('[E] sin token responde 401', async () => {
      await request(app.getHttpServer()).get('/publicaciones').expect(401);
    });

    it('[E] con un token vencido responde 401', async () => {
      const vencido = jwt.sign(
        { sub: usuarioId, perfil: 'usuario' },
        process.env.JWT_SECRET!,
        { expiresIn: -1 },
      );

      await request(app.getHttpServer())
        .get('/publicaciones')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);
    });

    it('[E] un limit que no es número responde 400', async () => {
      await listar('?limit=abc').expect(400);
    });
  });

  describe('caché', () => {
    const esperarQueVenza = () =>
      new Promise((resolver) => setTimeout(resolver, TTL_LISTADO_MS + 100));

    it('[O] dentro del tiempo, un segundo listado sale del caché', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);
      const primero = await listar().expect(200);
      await sembrarPublicaciones(app, usuarioId, 1);

      const segundo = await listar().expect(200);

      expect(primero.body.datos).toHaveLength(1);
      expect(segundo.body.datos).toHaveLength(1);
    });

    it('[B] vencido el tiempo, vuelve a leer la base', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);
      await listar().expect(200);
      await sembrarPublicaciones(app, usuarioId, 1);
      await esperarQueVenza();

      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(2);
    });

    it('[M] cada combinación de offset y limit tiene su propio listado', async () => {
      await sembrarPublicaciones(app, usuarioId, 3);

      const uno = await listar('?limit=1').expect(200);
      const dos = await listar('?limit=2').expect(200);

      expect(uno.body.datos).toHaveLength(1);
      expect(dos.body.datos).toHaveLength(2);
    });

    it('[S] al publicar, el listado se actualiza al instante', async () => {
      await sembrarPublicaciones(app, usuarioId, 1);
      await listar().expect(200);

      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', `Bearer ${token}`)
        .field('tipo', 'tip')
        .field('titulo', 'Recién publicada')
        .field('mensaje', 'Mensaje')
        .expect(201);
      const { body } = await listar().expect(200);

      expect(body.datos).toHaveLength(2);
      expect(body.datos[0].titulo).toBe('Recién publicada');
    });
  });
});
