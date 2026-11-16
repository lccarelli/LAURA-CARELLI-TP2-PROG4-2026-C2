import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Destino } from '../src/imagenes/destinos.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { crearApp, cloudinaryFalso, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  URL_IMAGEN_SUBIDA,
  pngDeTamano,
  registrarYObtenerSesion,
} from './ayudas/datos.js';

describe('POST /publicaciones', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let token: string;
  let usuarioId: string;

  const publicar = (
    campos: Record<string, string> = {
      titulo: 'Hola',
      mensaje: 'Primer mensaje',
    },
    archivo?: { contenido: Buffer; nombre: string; tipo: string },
    tokenUsado: string | undefined = token,
  ) => {
    const solicitud = request(app.getHttpServer()).post('/publicaciones');
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    for (const [campo, valor] of Object.entries({
      tipo: 'experiencia',
      ...campos,
    })) {
      solicitud.field(campo, valor);
    }
    if (archivo) {
      solicitud.attach('imagen', archivo.contenido, {
        filename: archivo.nombre,
        contentType: archivo.tipo,
      });
    }
    return solicitud;
  };

  beforeAll(async () => {
    app = await crearApp();
    publicaciones = app.get(getModelToken(Publicacion.name));
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

  const imagenPng = { contenido: PNG, nombre: 'foto.png', tipo: 'image/png' };

  describe('sin datos', () => {
    it('[Z] sin body responde 400 y no guarda nada', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(await publicaciones.countDocuments()).toBe(0);
    });
  });

  describe('una publicación', () => {
    it('[O] con título y mensaje válidos responde 201', async () => {
      await publicar().expect(201);
    });

    it('[O] queda guardada con el autor que indica el token', async () => {
      await publicar().expect(201);

      const guardada = await publicaciones.findOne();
      expect(guardada!.titulo).toBe('Hola');
      expect(guardada!.usuario.toString()).toBe(usuarioId);
    });

    it('[O] responde con la publicación y su autor', async () => {
      const { body } = await publicar().expect(201);

      expect(body.titulo).toBe('Hola');
      expect(body.usuario.nombreUsuario).toBe('laura_c');
      expect(body.usuario.clave).toBeUndefined();
    });
  });

  describe('varias publicaciones', () => {
    it('[M] el mismo usuario publica con y sin imagen', async () => {
      await publicar().expect(201);
      await publicar(
        { titulo: 'Con foto', mensaje: 'Mirá esto' },
        imagenPng,
      ).expect(201);

      expect(await publicaciones.countDocuments()).toBe(2);
      expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(1);
    });

    it('[M] dos usuarios publican, cada una con su autor', async () => {
      const otra = await registrarYObtenerSesion(app, {
        correo: 'juan@correo.com',
        nombreUsuario: 'juan_p',
      });

      const mia = await publicar().expect(201);
      const deJuan = await publicar(undefined, undefined, otra.token).expect(
        201,
      );

      expect(mia.body.usuario.nombreUsuario).toBe('laura_c');
      expect(deJuan.body.usuario.nombreUsuario).toBe('juan_p');
    });
  });

  describe('bordes', () => {
    it('[B] un mensaje de 2000 caracteres se guarda y uno de 2001 responde 400', async () => {
      await publicar({ titulo: 'Larga', mensaje: 'a'.repeat(2000) }).expect(
        201,
      );
      await publicar({ titulo: 'Más larga', mensaje: 'a'.repeat(2001) }).expect(
        400,
      );

      expect(await publicaciones.countDocuments()).toBe(1);
    });

    it('[B] una imagen de 2 MB exactos se acepta', async () => {
      await publicar(
        { titulo: 'Grande', mensaje: 'Pesada' },
        {
          ...imagenPng,
          contenido: pngDeTamano(2 * 1024 * 1024),
        },
      ).expect(201);
    });

    it('[B] una imagen de 2 MB más 1 byte se rechaza y no guarda nada', async () => {
      await publicar(
        { titulo: 'Grande', mensaje: 'Pesada' },
        {
          ...imagenPng,
          contenido: pngDeTamano(2 * 1024 * 1024 + 1),
        },
      ).expect(413);

      expect(await publicaciones.countDocuments()).toBe(0);
      expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
    });
  });

  describe('tipo', () => {
    it.each(['receta', 'tip', 'experiencia'])(
      '[M] el tipo %s se guarda',
      async (tipo) => {
        const { body } = await publicar({
          tipo,
          titulo: 'Hola',
          mensaje: 'Texto',
        }).expect(201);

        expect(body.tipo).toBe(tipo);
      },
    );

    it('[E] sin tipo o con un tipo desconocido responde 400', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', `Bearer ${token}`)
        .field('titulo', 'Hola')
        .field('mensaje', 'Texto')
        .expect(400);
      await publicar({
        tipo: 'chisme',
        titulo: 'Hola',
        mensaje: 'Texto',
      }).expect(400);

      expect(await publicaciones.countDocuments()).toBe(0);
    });

    it('[O] ingredientes y pasos se guardan y son opcionales', async () => {
      const completa = await publicar({
        tipo: 'receta',
        titulo: 'Tostadas',
        mensaje: 'Simples',
        ingredientes: JSON.stringify([
          { nombre: 'Pan', cantidad: 2, unidad: 'unidad' },
          { nombre: 'Manteca', cantidad: 50, unidad: 'g' },
          { nombre: 'Sal', unidad: 'a_gusto' },
        ]),
        pasos: JSON.stringify(['Tostar', 'Untar']),
      }).expect(201);
      const sola = await publicar().expect(201);

      expect(completa.body.ingredientes).toEqual([
        { nombre: 'Pan', cantidad: 2, unidad: 'unidad' },
        { nombre: 'Manteca', cantidad: 50, unidad: 'g' },
        { nombre: 'Sal', unidad: 'a_gusto' },
      ]);
      expect(completa.body.pasos).toEqual([
        { texto: 'Tostar' },
        { texto: 'Untar' },
      ]);
      expect(sola.body.ingredientes).toEqual([]);
      expect(sola.body.pasos).toEqual([]);
    });

    it('[O] la ficha se guarda como números y es opcional', async () => {
      const { body } = await publicar({
        tipo: 'receta',
        titulo: 'Crema de albahaca',
        mensaje: 'Versátil',
        porciones: '4',
        tipoRinde: 'unidades',
        tiempoMinutos: '19',
        costo: '2',
        calorias: '270',
      }).expect(201);
      const sola = await publicar().expect(201);

      expect(body).toMatchObject({
        porciones: 4,
        tipoRinde: 'unidades',
        tiempoMinutos: 19,
        costo: 2,
        calorias: 270,
      });
      expect(sola.body.porciones).toBeUndefined();
      expect(sola.body.costo).toBeUndefined();
    });

    it('[E] una ficha con texto, operadores o fuera de rango responde 400 y no guarda nada', async () => {
      const base = { tipo: 'receta', titulo: 'Hola', mensaje: 'Texto' };
      const malos: Record<string, string>[] = [
        { porciones: 'cuatro' },
        { porciones: '0' },
        { porciones: '101' },
        { tiempoMinutos: '1.5' },
        { tiempoMinutos: '-3' },
        { costo: '5' },
        { calorias: '270; DROP TABLE publicaciones' },
        { calorias: '{"$gt":0}' },
        { porciones: "1' OR '1'='1" },
        { tipoRinde: 'tazas' },
        { tipoRinde: '{"$ne":null}' },
      ];

      for (const mala of malos) {
        await publicar({ ...base, ...mala }).expect(400);
      }
      expect(await publicaciones.countDocuments()).toBe(0);
    });

    it('[E] ingredientes mal armados responden 400 y no guardan nada', async () => {
      const base = { tipo: 'receta', titulo: 'Hola', mensaje: 'Texto' };
      const con = (ingredientes: unknown) =>
        publicar({ ...base, ingredientes: JSON.stringify(ingredientes) });

      await publicar({ ...base, ingredientes: 'Pan\nManteca' }).expect(400);
      await con([{ nombre: 'Pan', cantidad: 0, unidad: 'g' }]).expect(400);
      await con([{ nombre: 'Pan', cantidad: 1, unidad: 'libra' }]).expect(400);
      await con([{ nombre: '', cantidad: 1, unidad: 'g' }]).expect(400);
      await con([
        { nombre: 'Pan', cantidad: 1, unidad: 'g', marca: 'X' },
      ]).expect(400);
      expect(await publicaciones.countDocuments()).toBe(0);
    });

    describe('fotos de los pasos', () => {
      const recetaConFotos = (
        pasos: unknown,
        fotos: number,
        extra: Record<string, string> = {},
      ) => {
        const solicitud = request(app.getHttpServer())
          .post('/publicaciones')
          .set('Authorization', `Bearer ${token}`)
          .field('tipo', 'receta')
          .field('titulo', 'Con fotos')
          .field('mensaje', 'Paso a paso')
          .field('pasos', JSON.stringify(pasos));
        for (const [campo, valor] of Object.entries(extra)) {
          solicitud.field(campo, valor);
        }
        for (let i = 0; i < fotos; i++) {
          solicitud.attach('imagenesPasos', PNG, {
            filename: `paso-${i}.png`,
            contentType: 'image/png',
          });
        }
        return solicitud;
      };

      it('[O] cada paso guarda su texto y, si la tiene, la URL de su foto', async () => {
        const { body } = await recetaConFotos(
          [
            { titulo: 'La masa', texto: 'Mezclar', fotos: [0, 1] },
            { texto: 'Dejar reposar' },
            { texto: 'Hornear', fotos: [2] },
          ],
          3,
        ).expect(201);

        expect(body.pasos).toEqual([
          {
            titulo: 'La masa',
            texto: 'Mezclar',
            imagenes: [URL_IMAGEN_SUBIDA, URL_IMAGEN_SUBIDA],
          },
          { texto: 'Dejar reposar' },
          { texto: 'Hornear', imagenes: [URL_IMAGEN_SUBIDA] },
        ]);
        expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(3);
      });

      it('[O] la descripción del paso es opcional: alcanza con un título o una foto', async () => {
        const { body } = await recetaConFotos(
          [{ titulo: 'Hornear' }, { texto: '   ', fotos: [0] }],
          1,
        ).expect(201);

        expect(body.pasos).toEqual([
          { titulo: 'Hornear' },
          { imagenes: [URL_IMAGEN_SUBIDA] },
        ]);
      });

      it('[E] un paso sin título, descripción ni foto responde 400', async () => {
        await recetaConFotos([{ titulo: '   ', texto: '' }], 0).expect(400);
      });

      it('[O] el título del paso es opcional: vacío o con espacios no se guarda', async () => {
        const { body } = await recetaConFotos(
          [
            { titulo: '   ', texto: 'Mezclar' },
            { titulo: '', texto: 'Hornear' },
          ],
          0,
        ).expect(201);

        expect(body.pasos).toEqual([
          { texto: 'Mezclar' },
          { texto: 'Hornear' },
        ]);
      });

      it('[B] un título de 80 caracteres y un texto de 2000 se guardan; 81 y 2001 responden 400', async () => {
        await recetaConFotos(
          [{ titulo: 'a'.repeat(80), texto: 'b'.repeat(2000) }],
          0,
        ).expect(201);
        await recetaConFotos(
          [{ titulo: 'a'.repeat(81), texto: 'b' }],
          0,
        ).expect(400);
        await recetaConFotos([{ texto: 'b'.repeat(2001) }], 0).expect(400);
      });

      it('[M] cada foto se sube con un nombre propio, aunque se suban a la vez', async () => {
        await recetaConFotos(
          [
            { texto: 'Mezclar', fotos: [0, 1] },
            { texto: 'Hornear', fotos: [2, 3] },
          ],
          4,
        ).expect(201);

        const nombres = cloudinaryFalso.subir.mock.calls.map(
          ([, , nombre]) => nombre,
        );
        expect(nombres).toHaveLength(4);
        expect(new Set(nombres).size).toBe(4);
      });

      it('[O] los pasos como texto simple siguen funcionando', async () => {
        const { body } = await recetaConFotos(['Mezclar', 'Hornear'], 0).expect(
          201,
        );

        expect(body.pasos).toEqual([
          { texto: 'Mezclar' },
          { texto: 'Hornear' },
        ]);
      });

      it('[E] una foto que no existe o repetida responde FOTO_DE_PASO_INVALIDA y no guarda nada', async () => {
        for (const pasos of [
          [{ texto: 'Mezclar', fotos: [1] }],
          [
            { texto: 'Mezclar', fotos: [0] },
            { texto: 'Hornear', fotos: [0] },
          ],
        ]) {
          const { body } = await recetaConFotos(pasos, 1).expect(400);
          expect(body.codigo).toBe('FOTO_DE_PASO_INVALIDA');
        }

        expect(await publicaciones.countDocuments()).toBe(0);
        expect(cloudinaryFalso.subir).not.toHaveBeenCalled();
      });

      it('[E] un número de foto negativo, decimal o fuera del máximo responde 400', async () => {
        for (const foto of [-1, 0.5, 20, '0']) {
          await recetaConFotos([{ texto: 'Mezclar', fotos: [foto] }], 1).expect(
            400,
          );
        }
        await recetaConFotos([{ texto: 'Mezclar', fotos: [0, 0] }], 2).expect(
          400,
        );
      });

      it('[B] un paso admite hasta 5 fotos y 6 se rechazan', async () => {
        const fotos = (cantidad: number) =>
          Array.from({ length: cantidad }, (_, i) => i);

        await recetaConFotos([{ texto: 'Mezclar', fotos: fotos(5) }], 5).expect(
          201,
        );
        await recetaConFotos([{ texto: 'Mezclar', fotos: fotos(6) }], 6).expect(
          400,
        );
      });

      it('[E] un paso con campos que no existen responde 400', async () => {
        await recetaConFotos(
          [{ texto: 'Mezclar', rol: 'admin', $set: { a: 1 } }],
          0,
        ).expect(400);
      });

      it('[E] un archivo que no es imagen responde IMAGEN_TIPO_INVALIDO', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/publicaciones')
          .set('Authorization', `Bearer ${token}`)
          .field('tipo', 'receta')
          .field('titulo', 'Mala')
          .field('mensaje', 'Foto falsa')
          .field('pasos', JSON.stringify([{ texto: 'Mezclar', fotos: [0] }]))
          .attach('imagenesPasos', Buffer.from('no soy una imagen'), {
            filename: 'paso.txt',
            contentType: 'text/plain',
          })
          .expect(400);

        expect(body.codigo).toBe('IMAGEN_TIPO_INVALIDO');
        expect(await publicaciones.countDocuments()).toBe(0);
      });

      it('[B] hasta 20 fotos de pasos en total pasan y 21 se rechazan', async () => {
        const pasos = (cantidad: number) =>
          Array.from({ length: Math.ceil(cantidad / 5) }, (_, paso) => ({
            texto: `Paso ${paso}`,
            fotos: Array.from(
              { length: Math.min(5, cantidad - paso * 5) },
              (_, i) => paso * 5 + i,
            ),
          }));

        await recetaConFotos(pasos(20), 20).expect(201);
        await recetaConFotos(pasos(20), 21).expect(400);
      });

      it('[M] la foto principal y las de los pasos conviven', async () => {
        const { body } = await recetaConFotos(
          [{ texto: 'Mezclar', fotos: [0] }],
          1,
        )
          .attach('imagen', PNG, {
            filename: 'portada.png',
            contentType: 'image/png',
          })
          .expect(201);

        expect(body.imagen).toBe(URL_IMAGEN_SUBIDA);
        expect(body.pasos[0].imagenes).toEqual([URL_IMAGEN_SUBIDA]);
        expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(2);
      });
    });

    it('[B] 40 ingredientes y 40 pasos pasan; 41 responden 400', async () => {
      const base = { tipo: 'receta', titulo: 'Hola', mensaje: 'Texto' };
      const lista = (cantidad: number) =>
        JSON.stringify(
          Array(cantidad).fill({ nombre: 'Sal', cantidad: 1, unidad: 'g' }),
        );
      await publicar({ ...base, ingredientes: lista(40) }).expect(201);
      await publicar({ ...base, ingredientes: lista(41) }).expect(400);
      const pasos = (cantidad: number) =>
        JSON.stringify(Array(cantidad).fill('Mezclar'));
      await publicar({ ...base, pasos: pasos(40) }).expect(201);
      await publicar({ ...base, pasos: pasos(41) }).expect(400);
      await publicar({ ...base, pasos: 'Mezclar\nHornear' }).expect(400);
    });
  });

  describe('contadores', () => {
    it('[Z] una publicación nueva empieza con 0 me gusta y 0 comentarios', async () => {
      const { body } = await publicar().expect(201);

      expect(body.cantidadMeGusta).toBe(0);
      expect(body.cantidadComentarios).toBe(0);
    });

    it('[I] los contadores no se pueden mandar en el body', async () => {
      await publicar({
        titulo: 'Hola',
        mensaje: 'Texto',
        cantidadMeGusta: '99',
      }).expect(400);
    });
  });

  describe('contrato', () => {
    it('[I] un campo usuario en el body responde 400', async () => {
      await publicar({
        titulo: 'Hola',
        mensaje: 'Primer mensaje',
        usuario: '507f1f77bcf86cd799439011',
      }).expect(400);

      expect(await publicaciones.countDocuments()).toBe(0);
    });
  });

  describe('errores', () => {
    it('[E] sin token responde 401', async () => {
      await publicar(undefined, undefined, '').expect(401);
    });

    it('[E] con un token inválido responde 401', async () => {
      await publicar(undefined, undefined, 'esto-no-es-un-token').expect(401);
    });

    it('[E] un archivo que no es imagen responde 400 y no guarda nada', async () => {
      await publicar(
        { titulo: 'Hola', mensaje: 'Texto' },
        {
          contenido: Buffer.from('texto plano'),
          nombre: 'nota.txt',
          tipo: 'text/plain',
        },
      ).expect(400);

      expect(await publicaciones.countDocuments()).toBe(0);
    });
  });

  describe('escenarios simples', () => {
    it('[S] la publicación nueva aparece primera en el listado', async () => {
      await publicar({ titulo: 'Vieja', mensaje: 'x' }).expect(201);
      await publicar({ titulo: 'Nueva', mensaje: 'y' }).expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/publicaciones')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.datos[0].titulo).toBe('Nueva');
    });

    it('[S] con imagen, la publicación guarda la URL que devuelve el almacenamiento', async () => {
      const { body } = await publicar(
        { titulo: 'Con foto', mensaje: 'Mirá' },
        imagenPng,
      ).expect(201);

      expect(body.imagen).toBe(URL_IMAGEN_SUBIDA);
      const [archivo, destino, nombre] = cloudinaryFalso.subir.mock.calls[0];
      expect(destino).toBe(Destino.PUBLICACIONES);
      expect(nombre).toMatch(
        new RegExp(`^${body.usuario._id}-experiencia-\\d+$`),
      );
      expect(archivo.mimetype).toBe('image/png');
      expect(archivo.buffer).toEqual(PNG);
    });
  });
});
