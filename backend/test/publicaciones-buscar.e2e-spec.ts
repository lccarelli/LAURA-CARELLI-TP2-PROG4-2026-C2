import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';

describe('GET /publicaciones?q=', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;
  let modelo: Model<Publicacion>;

  const buscar = (consulta: string) =>
    request(app.getHttpServer())
      .get(`/publicaciones?${consulta}`)
      .set('Authorization', `Bearer ${token}`);

  const titulos = (body: { datos: { titulo: string }[] }) =>
    body.datos.map((p) => p.titulo);

  const sembrar = (
    titulo: string,
    mensaje = 'Texto',
    extra?: Partial<Publicacion>,
  ) =>
    modelo.create({
      usuario: usuarioId,
      tipo: 'receta',
      titulo,
      mensaje,
      ...extra,
    });

  beforeAll(async () => {
    app = await crearApp();
    modelo = app.get(getModelToken(Publicacion.name));
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

  describe('coincidencias', () => {
    it('[O] encuentra por el título', async () => {
      await sembrar('Tarta de manzana');
      await sembrar('Milanesas');

      const { body } = await buscar('q=tarta').expect(200);

      expect(titulos(body)).toEqual(['Tarta de manzana']);
    });

    it('[O] encuentra por el mensaje', async () => {
      await sembrar('Postre', 'Lleva mucha canela');
      await sembrar('Otro', 'Sin nada');

      const { body } = await buscar('q=canela').expect(200);

      expect(titulos(body)).toEqual(['Postre']);
    });

    it('[O] no distingue mayúsculas de minúsculas', async () => {
      await sembrar('Tarta de MANZANA');

      const { body } = await buscar('q=manzana').expect(200);

      expect(titulos(body)).toEqual(['Tarta de MANZANA']);
    });

    it('[O] escribir sin tilde encuentra el texto con tilde', async () => {
      await sembrar('Ensalada rápida');

      const { body } = await buscar('q=rapida').expect(200);

      expect(titulos(body)).toEqual(['Ensalada rápida']);
    });

    it('[O] escribir con tilde encuentra el texto sin tilde', async () => {
      await sembrar('Ensalada rapida');

      const { body } = await buscar(`q=${encodeURIComponent('rápida')}`).expect(
        200,
      );

      expect(titulos(body)).toEqual(['Ensalada rapida']);
    });

    it('[O] encuentra con una palabra incompleta, como al ir tipeando', async () => {
      await sembrar('Tarta de manzana');

      const { body } = await buscar('q=manz').expect(200);

      expect(titulos(body)).toEqual(['Tarta de manzana']);
    });

    it('[O] con varias palabras deben estar todas, en cualquier orden y en título o mensaje', async () => {
      await sembrar('Tarta de manzana', 'Con canela');
      await sembrar('Tarta de pera', 'Con vainilla');

      const { body } = await buscar('q=canela%20tarta').expect(200);

      expect(titulos(body)).toEqual(['Tarta de manzana']);
    });

    it('[B] los espacios de más no cambian el resultado', async () => {
      await sembrar('Tarta de manzana');

      const { body } = await buscar('q=%20%20tarta%20%20%20manzana%20').expect(
        200,
      );

      expect(titulos(body)).toEqual(['Tarta de manzana']);
    });

    it('[E] los caracteres especiales de expresiones regulares se buscan como texto', async () => {
      await sembrar('Tarta (clásica)');
      await sembrar('Tarta de manzana');

      const { body } = await buscar(`q=${encodeURIComponent('(c')}`).expect(
        200,
      );

      expect(titulos(body)).toEqual(['Tarta (clásica)']);
    });

    it('[E] un patrón como .* no devuelve todo', async () => {
      await sembrar('Tarta de manzana');

      const { body } = await buscar(`q=${encodeURIComponent('.*')}`).expect(
        200,
      );

      expect(body.datos).toEqual([]);
    });

    it('[Z] sin coincidencias devuelve la lista vacía y hayMas falso', async () => {
      await sembrar('Tarta de manzana');

      const { body } = await buscar('q=pizza').expect(200);

      expect(body.datos).toEqual([]);
      expect(body.hayMas).toBe(false);
    });

    it('[E] no devuelve las publicaciones eliminadas', async () => {
      await sembrar('Tarta borrada', 'Texto', { activa: false });
      await sembrar('Tarta activa');

      const { body } = await buscar('q=tarta').expect(200);

      expect(titulos(body)).toEqual(['Tarta activa']);
    });
  });

  describe('con los demás parámetros', () => {
    it('[O] se combina con el tipo', async () => {
      await sembrar('Tarta receta', 'Texto', { tipo: 'receta' });
      await sembrar('Tarta tip', 'Texto', { tipo: 'tip' });

      const { body } = await buscar('q=tarta&tipo=tip').expect(200);

      expect(titulos(body)).toEqual(['Tarta tip']);
    });

    it('[O] se combina con el orden por me gusta', async () => {
      await sembrar('Tarta poco', 'Texto', { cantidadMeGusta: 1 });
      await sembrar('Tarta mucho', 'Texto', { cantidadMeGusta: 9 });

      const { body } = await buscar('q=tarta&orden=megusta').expect(200);

      expect(titulos(body)).toEqual(['Tarta mucho', 'Tarta poco']);
    });

    it('[O] por defecto ordena de la más nueva a la más vieja', async () => {
      await sembrar('Tarta vieja', 'Texto', {
        fecha: new Date('2026-01-01T10:00:00'),
      });
      await sembrar('Tarta nueva', 'Texto', {
        fecha: new Date('2026-02-01T10:00:00'),
      });

      const { body } = await buscar('q=tarta').expect(200);

      expect(titulos(body)).toEqual(['Tarta nueva', 'Tarta vieja']);
    });

    it('[S] pagina los resultados con offset, limit y hayMas', async () => {
      for (const numero of [1, 2, 3]) {
        await sembrar(`Tarta ${numero}`, 'Texto', {
          fecha: new Date(`2026-01-0${numero}T10:00:00`),
        });
      }

      const primera = (await buscar('q=tarta&limit=2').expect(200)).body;
      const segunda = (await buscar('q=tarta&limit=2&offset=2').expect(200))
        .body;

      expect(titulos(primera)).toEqual(['Tarta 3', 'Tarta 2']);
      expect(primera.hayMas).toBe(true);
      expect(titulos(segunda)).toEqual(['Tarta 1']);
      expect(segunda.hayMas).toBe(false);
    });

    it('[I] mantiene el mismo formato de respuesta del listado', async () => {
      await sembrar('Tarta');

      const { body } = await buscar('q=tarta').expect(200);

      expect(body).toEqual({
        datos: expect.any(Array),
        offset: 0,
        limit: 10,
        hayMas: false,
      });
      expect(body.datos[0].usuario.nombreUsuario).toBe('laura_c');
    });

    it('[S] no usa el caché: una publicación nueva aparece en la búsqueda siguiente', async () => {
      await sembrar('Tarta uno');
      await buscar('q=tarta').expect(200);
      await sembrar('Tarta dos');

      const { body } = await buscar('q=tarta').expect(200);

      expect(body.datos).toHaveLength(2);
    });
  });

  describe('errores', () => {
    it.each([
      ['una sola letra', 'q=a'],
      ['vacía', 'q='],
      ['sólo espacios', 'q=%20%20%20'],
      ['más de 60 caracteres', `q=${'a'.repeat(61)}`],
      ['más de 5 palabras', 'q=uno%20dos%20tres%20cuatro%20cinco%20seis'],
    ])('[E] rechaza una búsqueda %s con 400', async (_nombre, consulta) => {
      const respuesta = await buscar(consulta);

      expect(respuesta.status).toBe(400);
    });

    it('[B] acepta exactamente 2 letras, 60 caracteres y 5 palabras', async () => {
      await sembrar('Tarta');

      await buscar('q=ta').expect(200);
      await buscar(`q=${'a'.repeat(60)}`).expect(200);
      const { body } = await buscar('q=a%20b%20c%20d%20e').expect(200);

      expect(body.datos).toEqual([]);
    });

    it('[E] sin sesión responde 401', async () => {
      await request(app.getHttpServer())
        .get('/publicaciones?q=tarta')
        .expect(401);
    });
  });
});
