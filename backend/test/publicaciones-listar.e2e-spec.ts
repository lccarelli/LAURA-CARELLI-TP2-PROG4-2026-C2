import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
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
      expect([...ids].sort((a, b) => b.localeCompare(a))).toEqual(ids);
    });
  });

  describe('orden y filtros', () => {
    const modelo = () =>
      app.get<Model<Publicacion>>(getModelToken(Publicacion.name));
    const titulos = (body: { datos: { titulo: string }[] }) =>
      body.datos.map(({ titulo }) => titulo);
    const darMeGusta = (id: string, cantidad: number) =>
      modelo().updateOne({ _id: id }, { cantidadMeGusta: cantidad });
    const otraPersona = () =>
      registrarYObtenerSesion(app, {
        correo: 'juan@correo.com',
        nombreUsuario: 'juan_p',
      });

    it('[O] por defecto ordena por fecha, de la más reciente a la más antigua', async () => {
      await sembrarPublicaciones(app, usuarioId, 3);

      const { body } = await listar().expect(200);
      const explicito = await listar('?orden=fecha').expect(200);

      expect(titulos(body)).toEqual(['Título 3', 'Título 2', 'Título 1']);
      expect(titulos(explicito.body)).toEqual(titulos(body));
    });

    it('[O] con orden=megusta va primero la que tiene más me gusta', async () => {
      const [una, dos, tres] = await sembrarPublicaciones(app, usuarioId, 3);
      await darMeGusta(una.id, 5);
      await darMeGusta(dos.id, 1);
      await darMeGusta(tres.id, 3);

      const { body } = await listar('?orden=megusta').expect(200);

      expect(titulos(body)).toEqual(['Título 1', 'Título 3', 'Título 2']);
    });

    it('[M] con los mismos me gusta, desempata por fecha y las páginas no repiten ni omiten', async () => {
      const creadas = await sembrarPublicaciones(app, usuarioId, 6);
      await Promise.all(creadas.map(({ id }) => darMeGusta(id, 2)));

      const paginas = await Promise.all(
        [0, 2, 4].map((offset) =>
          listar(`?orden=megusta&limit=2&offset=${offset}`).expect(200),
        ),
      );

      const todos = paginas.flatMap(({ body }) => titulos(body));
      expect(todos).toEqual([
        'Título 6',
        'Título 5',
        'Título 4',
        'Título 3',
        'Título 2',
        'Título 1',
      ]);
    });

    it('[B] las publicaciones sin me gusta quedan al final del orden por me gusta', async () => {
      const [una, , tres] = await sembrarPublicaciones(app, usuarioId, 3);
      await darMeGusta(tres.id, 1);
      await darMeGusta(una.id, 0);

      const { body } = await listar('?orden=megusta').expect(200);

      expect(titulos(body)[0]).toBe('Título 3');
    });

    it('[O] con usuario=<id> trae sólo las publicaciones de esa persona', async () => {
      const otra = await otraPersona();
      await sembrarPublicaciones(app, usuarioId, 2);
      await sembrarPublicaciones(app, otra.usuario._id, 3);

      const mias = await listar(`?usuario=${usuarioId}`).expect(200);
      const deJuan = await listar(`?usuario=${otra.usuario._id}`).expect(200);

      expect(mias.body.datos).toHaveLength(2);
      expect(deJuan.body.datos).toHaveLength(3);
      expect(
        deJuan.body.datos.every(
          ({ usuario }: { usuario: { _id: string } }) =>
            usuario._id === otra.usuario._id,
        ),
      ).toBe(true);
    });

    it('[M] el filtro por usuario se combina con el orden y con la paginación', async () => {
      const creadas = await sembrarPublicaciones(app, usuarioId, 5);
      await darMeGusta(creadas[0].id, 9);

      const { body } = await listar(
        `?usuario=${usuarioId}&orden=megusta&limit=2`,
      ).expect(200);

      expect(titulos(body)[0]).toBe('Título 1');
      expect(body.datos).toHaveLength(2);
      expect(body.hayMas).toBe(true);
    });

    it('[B] una persona sin publicaciones devuelve la lista vacía', async () => {
      const otra = await otraPersona();
      await sembrarPublicaciones(app, usuarioId, 2);

      const { body } = await listar(`?usuario=${otra.usuario._id}`).expect(200);

      expect(body.datos).toEqual([]);
      expect(body.hayMas).toBe(false);
    });

    it('[E] un orden desconocido responde 400', async () => {
      for (const orden of ['autor', '', 'FECHA', '%7B%22%24ne%22%3Anull%7D']) {
        await listar(`?orden=${orden}`).expect(400);
      }
    });

    it('[E] un usuario que no es un id, o con operadores, responde 400', async () => {
      for (const usuario of ['abc', '123', '[$ne]=x']) {
        await listar(`?usuario=${usuario}`).expect(400);
      }
      await listar('?usuario[$ne]=64b64b64b64b64b64b64b64b').expect(400);
    });

    it('[I] las publicaciones dadas de baja no aparecen en ningún orden ni filtro', async () => {
      const [una] = await sembrarPublicaciones(app, usuarioId, 2);
      await modelo().updateOne({ _id: una.id }, { activa: false });

      for (const consulta of ['', '?orden=megusta', `?usuario=${usuarioId}`]) {
        const { body } = await listar(consulta).expect(200);
        expect(body.datos, consulta).toHaveLength(1);
      }
    });

    it('[I] cada elemento trae meGusta, en falso si todavía no di me gusta', async () => {
      await sembrarPublicaciones(app, usuarioId, 2);

      const { body } = await listar().expect(200);

      expect(
        body.datos.map(({ meGusta }: { meGusta: boolean }) => meGusta),
      ).toEqual([false, false]);
    });

    it('[S] listados con distinto orden o filtro no se pisan en el caché', async () => {
      const [una] = await sembrarPublicaciones(app, usuarioId, 2);
      await darMeGusta(una.id, 4);

      const porFecha = await listar().expect(200);
      const porMeGusta = await listar('?orden=megusta').expect(200);

      expect(titulos(porFecha.body)).toEqual(['Título 2', 'Título 1']);
      expect(titulos(porMeGusta.body)).toEqual(['Título 1', 'Título 2']);
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

      expect(Object.keys(body).sort((a, b) => a.localeCompare(b))).toEqual([
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
