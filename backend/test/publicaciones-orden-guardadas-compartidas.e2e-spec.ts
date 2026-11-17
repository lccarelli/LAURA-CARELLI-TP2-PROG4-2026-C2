import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';
import { sembrarPublicaciones } from './ayudas/publicaciones.js';

type Sesion = { token: string; usuario: { _id: string } };

describe('GET /publicaciones?orden=guardadas|compartidas', () => {
  let app: INestApplication;
  let yo: Sesion;
  let otra: Sesion;

  const modelo = () =>
    app.get<Model<Publicacion>>(getModelToken(Publicacion.name));
  const listar = (consulta: string) =>
    request(app.getHttpServer())
      .get(`/publicaciones${consulta}`)
      .set('Authorization', `Bearer ${yo.token}`);
  const titulos = (body: { datos: { titulo: string }[] }) =>
    body.datos.map(({ titulo }) => titulo);
  const poner = (id: string, campo: string, cantidad: number) =>
    modelo().updateOne({ _id: id }, { [campo]: cantidad });

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(async () => {
    await limpiarBase(app);
    yo = await registrarYObtenerSesion(app);
    otra = await registrarOtraPersona(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe.each([
    ['guardadas', 'cantidadGuardados'],
    ['compartidas', 'cantidadCompartidas'],
  ])('orden=%s', (orden, campo) => {
    it('[O] va primero la que tiene más', async () => {
      const [una, dos, tres] = await sembrarPublicaciones(
        app,
        yo.usuario._id,
        3,
      );
      await poner(una.id, campo, 5);
      await poner(dos.id, campo, 1);
      await poner(tres.id, campo, 3);

      const { body } = await listar(`?orden=${orden}`).expect(200);

      expect(titulos(body)).toEqual(['Título 1', 'Título 3', 'Título 2']);
    });

    it('[M] con la misma cantidad desempata por fecha y las páginas no repiten ni omiten', async () => {
      const creadas = await sembrarPublicaciones(app, yo.usuario._id, 6);
      await Promise.all(creadas.map(({ id }) => poner(id, campo, 2)));

      const paginas = await Promise.all(
        [0, 2, 4].map((offset) =>
          listar(`?orden=${orden}&limit=2&offset=${offset}`).expect(200),
        ),
      );

      expect(paginas.flatMap(({ body }) => titulos(body))).toEqual([
        'Título 6',
        'Título 5',
        'Título 4',
        'Título 3',
        'Título 2',
        'Título 1',
      ]);
    });

    it('[B] las que no tienen ninguna quedan al final, ordenadas por fecha', async () => {
      const [, dos] = await sembrarPublicaciones(app, yo.usuario._id, 3);
      await poner(dos.id, campo, 1);

      const { body } = await listar(`?orden=${orden}`).expect(200);

      expect(titulos(body)).toEqual(['Título 2', 'Título 3', 'Título 1']);
    });

    it('[Z] sin publicaciones devuelve la lista vacía', async () => {
      const { body } = await listar(`?orden=${orden}`).expect(200);

      expect(body.datos).toEqual([]);
      expect(body.hayMas).toBe(false);
    });

    it('[S] se combina con el tipo, el usuario y la búsqueda', async () => {
      const [una, dos] = await sembrarPublicaciones(app, yo.usuario._id, 2);
      await modelo().updateOne({ _id: una.id }, { tipo: 'receta', [campo]: 1 });
      await modelo().updateOne({ _id: dos.id }, { tipo: 'receta', [campo]: 4 });

      const porTipo = await listar(`?orden=${orden}&tipo=receta`).expect(200);
      const porUsuario = await listar(
        `?orden=${orden}&usuario=${otra.usuario._id}`,
      ).expect(200);
      const porBusqueda = await listar(
        `?orden=${orden}&q=${encodeURIComponent('Título 1')}`,
      ).expect(200);

      expect(titulos(porTipo.body)).toEqual(['Título 2', 'Título 1']);
      expect(porUsuario.body.datos).toEqual([]);
      expect(titulos(porBusqueda.body)).toEqual(['Título 1']);
    });

    it('[S] una publicación eliminada no aparece', async () => {
      const [una] = await sembrarPublicaciones(app, yo.usuario._id, 2);
      await modelo().updateOne({ _id: una.id }, { [campo]: 9, activa: false });

      const { body } = await listar(`?orden=${orden}`).expect(200);

      expect(titulos(body)).toEqual(['Título 2']);
    });

    it('[E] sin token responde 401', async () => {
      await request(app.getHttpServer())
        .get(`/publicaciones?orden=${orden}`)
        .expect(401);
    });
  });

  describe('con acciones reales', () => {
    it('[O] al guardar una publicación sube en el orden por guardadas, sin esperar a que venza la memoria', async () => {
      const [una, dos] = await sembrarPublicaciones(app, yo.usuario._id, 2);
      const antes = await listar('?orden=guardadas').expect(200);

      await request(app.getHttpServer())
        .post(`/publicaciones/${una.id}/guardar`)
        .set('Authorization', `Bearer ${otra.token}`)
        .expect(201);
      const despues = await listar('?orden=guardadas').expect(200);

      expect(titulos(antes.body)).toEqual(['Título 2', 'Título 1']);
      expect(titulos(despues.body)).toEqual(['Título 1', 'Título 2']);
      expect(dos.id).not.toBe(una.id);
    });

    it('[O] al quitar el guardado baja de nuevo', async () => {
      const [una] = await sembrarPublicaciones(app, yo.usuario._id, 2);
      const como = (metodo: 'guardar' | 'quitar-guardado') =>
        request(app.getHttpServer())
          .post(`/publicaciones/${una.id}/${metodo}`)
          .set('Authorization', `Bearer ${otra.token}`);
      await como('guardar').expect(201);
      await como('quitar-guardado').expect(200);

      const { body } = await listar('?orden=guardadas').expect(200);

      expect(titulos(body)).toEqual(['Título 2', 'Título 1']);
    });

    it('[O] al compartir una publicación sube en el orden por compartidas, tantas veces como se comparta', async () => {
      const [una] = await sembrarPublicaciones(app, yo.usuario._id, 2);

      await request(app.getHttpServer())
        .post(`/publicaciones/${una.id}/compartir`)
        .set('Authorization', `Bearer ${yo.token}`)
        .send({ usuarios: [otra.usuario._id] })
        .expect(201);
      const { body } = await listar('?orden=compartidas').expect(200);

      expect(titulos(body)).toEqual(['Título 1', 'Título 2']);
      expect(body.datos[0].cantidadCompartidas).toBe(1);
    });

    it('[I] los otros órdenes siguen funcionando', async () => {
      await sembrarPublicaciones(app, yo.usuario._id, 2);

      const fecha = await listar('?orden=fecha').expect(200);
      const megusta = await listar('?orden=megusta').expect(200);

      expect(titulos(fecha.body)).toEqual(['Título 2', 'Título 1']);
      expect(megusta.body.datos).toHaveLength(2);
    });

    it('[E] un orden desconocido responde 400', async () => {
      await listar('?orden=compartido').expect(400);
    });
  });
});
