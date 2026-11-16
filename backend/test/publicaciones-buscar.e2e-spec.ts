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

  type Semilla = [
    titulo: string,
    mensaje?: string,
    extra?: Partial<Publicacion>,
  ];

  const sembrarVarias = async (semillas: Semilla[]) => {
    for (const [titulo, mensaje, extra] of semillas) {
      await sembrar(titulo, mensaje, extra);
    }
  };

  const titulosDe = async (consulta: string) =>
    titulos((await buscar(consulta).expect(200)).body);

  describe('coincidencias', () => {
    it.each<[string, Semilla[], string, string[]]>([
      [
        'encuentra por el título',
        [['Tarta de manzana'], ['Milanesas']],
        'q=tarta',
        ['Tarta de manzana'],
      ],
      [
        'encuentra por el mensaje',
        [
          ['Postre', 'Lleva mucha canela'],
          ['Otro', 'Sin nada'],
        ],
        'q=canela',
        ['Postre'],
      ],
      [
        'no distingue mayúsculas de minúsculas',
        [['Tarta de MANZANA']],
        'q=manzana',
        ['Tarta de MANZANA'],
      ],
      [
        'escribir sin tilde encuentra el texto con tilde',
        [['Ensalada rápida']],
        'q=rapida',
        ['Ensalada rápida'],
      ],
      [
        'escribir con tilde encuentra el texto sin tilde',
        [['Ensalada rapida']],
        `q=${encodeURIComponent('rápida')}`,
        ['Ensalada rapida'],
      ],
      [
        'encuentra con una palabra incompleta, como al ir tipeando',
        [['Tarta de manzana']],
        'q=manz',
        ['Tarta de manzana'],
      ],
      [
        'con varias palabras deben estar todas, en cualquier orden y en título o mensaje',
        [
          ['Tarta de manzana', 'Con canela'],
          ['Tarta de pera', 'Con vainilla'],
        ],
        'q=canela%20tarta',
        ['Tarta de manzana'],
      ],
      [
        'los espacios de más no cambian el resultado',
        [['Tarta de manzana']],
        'q=%20%20tarta%20%20%20manzana%20',
        ['Tarta de manzana'],
      ],
      [
        'los caracteres especiales de expresiones regulares se buscan como texto',
        [['Tarta (clásica)'], ['Tarta de manzana']],
        `q=${encodeURIComponent('(c')}`,
        ['Tarta (clásica)'],
      ],
      [
        'un patrón como .* no devuelve todo',
        [['Tarta de manzana']],
        `q=${encodeURIComponent('.*')}`,
        [],
      ],
      ['sin coincidencias devuelve la lista vacía', [['Tarta']], 'q=pizza', []],
      [
        'no devuelve las publicaciones eliminadas',
        [['Tarta borrada', 'Texto', { activa: false }], ['Tarta activa']],
        'q=tarta',
        ['Tarta activa'],
      ],
    ])('[O] %s', async (_nombre, semillas, consulta, esperados) => {
      await sembrarVarias(semillas);

      expect(await titulosDe(consulta)).toEqual(esperados);
    });
  });

  describe('con los demás parámetros', () => {
    it.each<[string, Semilla[], string, string[]]>([
      [
        'se combina con el tipo',
        [
          ['Tarta receta', 'Texto', { tipo: 'receta' }],
          ['Tarta tip', 'Texto', { tipo: 'tip' }],
        ],
        'q=tarta&tipo=tip',
        ['Tarta tip'],
      ],
      [
        'se combina con el orden por me gusta',
        [
          ['Tarta poco', 'Texto', { cantidadMeGusta: 1 }],
          ['Tarta mucho', 'Texto', { cantidadMeGusta: 9 }],
        ],
        'q=tarta&orden=megusta',
        ['Tarta mucho', 'Tarta poco'],
      ],
      [
        'por defecto ordena de la más nueva a la más vieja',
        [
          ['Tarta vieja', 'Texto', { fecha: new Date('2026-01-01T10:00:00') }],
          ['Tarta nueva', 'Texto', { fecha: new Date('2026-02-01T10:00:00') }],
        ],
        'q=tarta',
        ['Tarta nueva', 'Tarta vieja'],
      ],
    ])('[O] %s', async (_nombre, semillas, consulta, esperados) => {
      await sembrarVarias(semillas);

      expect(await titulosDe(consulta)).toEqual(esperados);
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
