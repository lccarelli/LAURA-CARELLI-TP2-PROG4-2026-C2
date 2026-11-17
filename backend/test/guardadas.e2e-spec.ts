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

type Sesion = { token: string; usuario: { _id: string } };

describe('publicaciones guardadas', () => {
  let app: INestApplication;
  let modelo: Model<Publicacion>;
  let yo: Sesion;
  let otra: Sesion;

  const con = (sesion: Sesion) => ({
    guardar: (id: string) =>
      request(app.getHttpServer())
        .post(`/publicaciones/${id}/guardar`)
        .set('Authorization', `Bearer ${sesion.token}`),
    quitar: (id: string) =>
      request(app.getHttpServer())
        .delete(`/publicaciones/${id}/guardar`)
        .set('Authorization', `Bearer ${sesion.token}`),
    listar: (consulta = '') =>
      request(app.getHttpServer())
        .get(`/guardadas${consulta}`)
        .set('Authorization', `Bearer ${sesion.token}`),
    letras: (consulta = '') =>
      request(app.getHttpServer())
        .get(`/guardadas/letras${consulta}`)
        .set('Authorization', `Bearer ${sesion.token}`),
  });

  const crear = async (titulo: string, tipo = 'experiencia', autor = yo) =>
    (
      await modelo.create({
        usuario: autor.usuario._id,
        tipo,
        titulo,
        mensaje: `Mensaje de ${titulo}`,
        fecha: new Date(),
      })
    ).id as string;

  const guardarTitulos = async (titulos: string[], tipo = 'experiencia') => {
    for (const titulo of titulos) {
      await con(yo)
        .guardar(await crear(titulo, tipo))
        .expect(200);
    }
  };

  const titulosDe = async (consulta = '') =>
    (await con(yo).listar(consulta).expect(200)).body.datos.map(
      ({ titulo }: { titulo: string }) => titulo,
    );

  beforeAll(async () => {
    app = await crearApp();
    modelo = app.get(getModelToken(Publicacion.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    yo = await registrarYObtenerSesion(app);
    otra = await registrarOtraPersona(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('guardar y quitar', () => {
    it('[O] guardar responde 200 y la publicación queda marcada como guardada', async () => {
      const id = await crear('Tarta');

      const { body } = await con(yo).guardar(id).expect(200);
      const detalle = await request(app.getHttpServer())
        .get(`/publicaciones/${id}`)
        .set('Authorization', `Bearer ${yo.token}`);

      expect(body).toEqual({ guardada: true });
      expect(detalle.body.guardada).toBe(true);
    });

    it('[I] la marca es de cada persona: la otra no la ve guardada', async () => {
      const id = await crear('Tarta');
      await con(yo).guardar(id).expect(200);

      const detalle = await request(app.getHttpServer())
        .get(`/publicaciones/${id}`)
        .set('Authorization', `Bearer ${otra.token}`);

      expect(detalle.body.guardada).toBe(false);
    });

    it('[I] el listado general también marca cuáles están guardadas', async () => {
      const guardada = await crear('Tarta');
      await crear('Pan');
      await con(yo).guardar(guardada).expect(200);

      const { body } = await request(app.getHttpServer())
        .get('/publicaciones')
        .set('Authorization', `Bearer ${yo.token}`);

      const marcas = Object.fromEntries(
        body.datos.map((p: { titulo: string; guardada: boolean }) => [
          p.titulo,
          p.guardada,
        ]),
      );
      expect(marcas).toEqual({ Tarta: true, Pan: false });
    });

    it('[B] guardar dos veces es lo mismo que una', async () => {
      const id = await crear('Tarta');

      await con(yo).guardar(id).expect(200);
      await con(yo).guardar(id).expect(200);

      expect(await titulosDe()).toEqual(['Tarta']);
    });

    it('[S] quitar la saca de la lista y responde 204', async () => {
      const id = await crear('Tarta');
      await con(yo).guardar(id).expect(200);

      await con(yo).quitar(id).expect(204);

      expect(await titulosDe()).toEqual([]);
    });

    it('[B] quitar una que no estaba guardada también responde 204', async () => {
      await con(yo)
        .quitar(await crear('Tarta'))
        .expect(204);
    });

    it('[S] quitar la propia no toca la de otra persona', async () => {
      const id = await crear('Tarta');
      await con(yo).guardar(id).expect(200);
      await con(otra).guardar(id).expect(200);

      await con(yo).quitar(id).expect(204);

      expect((await con(otra).listar().expect(200)).body.datos).toHaveLength(1);
    });

    it.each([
      ['no existe', '64b64b64b64b64b64b64b64b', 404],
      ['tiene un id inválido', 'abc', 400],
    ])(
      '[E] guardar una publicación que %s responde %i',
      async (_caso, id, estado) => {
        await con(yo).guardar(id).expect(estado);
      },
    );

    it('[E] guardar una publicación eliminada responde 404', async () => {
      const id = await crear('Tarta');
      await modelo.updateOne({ _id: id }, { activa: false });

      const { body } = await con(yo).guardar(id).expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] sin token responde 401 en las cuatro rutas', async () => {
      const id = await crear('Tarta');
      const servidor = request(app.getHttpServer());

      await servidor.post(`/publicaciones/${id}/guardar`).expect(401);
      await servidor.delete(`/publicaciones/${id}/guardar`).expect(401);
      await servidor.get('/guardadas').expect(401);
      await servidor.get('/guardadas/letras').expect(401);
    });
  });

  describe('listar', () => {
    it('[O] ordena de la A a la Z sin distinguir mayúsculas ni tildes', async () => {
      await guardarTitulos([
        'bizcocho',
        'Álamo',
        'Zapallo',
        'avena',
        'Cebolla',
      ]);

      expect(await titulosDe()).toEqual([
        'Álamo',
        'avena',
        'bizcocho',
        'Cebolla',
        'Zapallo',
      ]);
    });

    it('[I] la Ñ va después de la N y antes de la O', async () => {
      await guardarTitulos(['Ojo', 'Ñoquis', 'Nuez', 'Mate']);

      expect(await titulosDe()).toEqual(['Mate', 'Nuez', 'Ñoquis', 'Ojo']);
    });

    it('[I] ordena por título aunque se hayan guardado en otro orden', async () => {
      await guardarTitulos(['Z', 'A', 'M']);

      expect(await titulosDe()).toEqual(['A', 'M', 'Z']);
    });

    it('[S] sólo devuelve las guardadas por la persona', async () => {
      const mia = await crear('Mía');
      const deLaOtra = await crear('De la otra');
      await con(yo).guardar(mia).expect(200);
      await con(otra).guardar(deLaOtra).expect(200);

      expect(await titulosDe()).toEqual(['Mía']);
    });

    it('[S] puede guardar publicaciones de otras personas y todas vienen marcadas', async () => {
      const ajena = await crear('Ajena', 'tip', otra);
      await con(yo).guardar(ajena).expect(200);

      const { body } = await con(yo).listar().expect(200);

      expect(body.datos[0]).toMatchObject({
        titulo: 'Ajena',
        guardada: true,
        meGusta: false,
        usuario: { nombreUsuario: 'juan_p' },
      });
    });

    it('[S] una publicación eliminada deja de aparecer', async () => {
      const id = await crear('Tarta');
      await con(yo).guardar(id).expect(200);
      await modelo.updateOne({ _id: id }, { activa: false });

      expect(await titulosDe()).toEqual([]);
    });

    it('[Z] sin guardadas responde una lista vacía', async () => {
      const { body } = await con(yo).listar().expect(200);

      expect(body).toEqual({ datos: [], offset: 0, limit: 10, hayMas: false });
    });

    it.each([
      ['A', ['Álamo', 'avena']],
      ['B', ['Bizcocho']],
      ['Ñ', ['Ñoquis']],
      ['#', ['¡Hola!', '1 huevo']],
      ['Q', []],
    ])('[I] con letra=%s devuelve %j', async (letra, esperados) => {
      await guardarTitulos([
        'Bizcocho',
        'Álamo',
        'avena',
        'Ñoquis',
        '1 huevo',
        '¡Hola!',
      ]);

      expect(await titulosDe(`?letra=${encodeURIComponent(letra)}`)).toEqual(
        esperados,
      );
    });

    it('[I] filtra por tipo y por texto de búsqueda, como el listado general', async () => {
      await guardarTitulos(['Tarta de manzana', 'Tarta de pera'], 'receta');
      await guardarTitulos(['Trucos de tarta'], 'tip');

      expect(await titulosDe('?tipo=receta')).toEqual([
        'Tarta de manzana',
        'Tarta de pera',
      ]);
      expect(await titulosDe('?q=manzana')).toEqual(['Tarta de manzana']);
      expect(await titulosDe('?q=tarta&tipo=tip')).toEqual(['Trucos de tarta']);
    });

    it('[B] pagina sobre el orden alfabético y avisa si hay más', async () => {
      await guardarTitulos(['D', 'B', 'A', 'C', 'E']);

      const primera = (await con(yo).listar('?limit=2').expect(200)).body;
      const ultima = (await con(yo).listar('?limit=2&offset=4').expect(200))
        .body;

      expect(
        primera.datos.map(({ titulo }: { titulo: string }) => titulo),
      ).toEqual(['A', 'B']);
      expect(primera.hayMas).toBe(true);
      expect(
        ultima.datos.map(({ titulo }: { titulo: string }) => titulo),
      ).toEqual(['E']);
      expect(ultima.hayMas).toBe(false);
    });

    it('[S] la paginación respeta la letra elegida', async () => {
      await guardarTitulos(['Ana', 'Ajo', 'Arroz', 'Bife']);

      const { body } = await con(yo).listar('?letra=A&limit=2').expect(200);

      expect(
        body.datos.map(({ titulo }: { titulo: string }) => titulo),
      ).toEqual(['Ajo', 'Ana']);
      expect(body.hayMas).toBe(true);
    });

    it.each([
      ['letra en minúscula', '?letra=a'],
      ['letra de dos caracteres', '?letra=AB'],
      ['tipo inválido', '?tipo=postre'],
      ['búsqueda de una letra', '?q=a'],
      ['limit de 51', '?limit=51'],
      ['offset negativo', '?offset=-1'],
      ['parámetro desconocido', '?orden=fecha'],
    ])('[E] %s responde 400', async (_caso, consulta) => {
      await con(yo).listar(consulta).expect(400);
    });
  });

  describe('letras', () => {
    it('[O] cuenta cuántas hay con cada inicial, con todas las letras del índice', async () => {
      await guardarTitulos(['Álamo', 'avena', 'Ñoquis', '1 huevo']);

      const { body } = await con(yo).letras().expect(200);

      expect(body.total).toBe(4);
      expect(body.letras.A).toBe(2);
      expect(body.letras['Ñ']).toBe(1);
      expect(body.letras['#']).toBe(1);
      expect(body.letras.B).toBe(0);
      expect(Object.keys(body.letras)).toHaveLength(28);
    });

    it('[I] las letras vienen en el orden del índice, con la Ñ después de la N', async () => {
      const { body } = await con(yo).letras().expect(200);

      const letras = Object.keys(body.letras);
      expect(letras.indexOf('Ñ')).toBe(letras.indexOf('N') + 1);
      expect(letras[0]).toBe('A');
      expect(letras.at(-1)).toBe('#');
    });

    it('[I] respeta la búsqueda y el tipo', async () => {
      await guardarTitulos(['Tarta', 'Torta'], 'receta');
      await guardarTitulos(['Truco'], 'tip');

      const { body } = await con(yo).letras('?q=tarta').expect(200);
      const soloTips = await con(yo).letras('?tipo=tip').expect(200);

      expect(body.total).toBe(1);
      expect(body.letras.T).toBe(1);
      expect(soloTips.body.total).toBe(1);
    });

    it('[S] sólo cuenta las guardadas por la persona y las que siguen activas', async () => {
      const mia = await crear('Mía');
      const eliminada = await crear('Eliminada');
      await con(yo).guardar(mia).expect(200);
      await con(yo).guardar(eliminada).expect(200);
      await con(otra)
        .guardar(await crear('Otra'))
        .expect(200);
      await modelo.updateOne({ _id: eliminada }, { activa: false });

      const { body } = await con(yo).letras().expect(200);

      expect(body.total).toBe(1);
      expect(body.letras.M).toBe(1);
    });
  });
});
