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
    it.each(['receta', 'tip', 'experiencia', 'completa'])(
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
      expect(completa.body.pasos).toEqual(['Tostar', 'Untar']);
      expect(sola.body.ingredientes).toEqual([]);
      expect(sola.body.pasos).toEqual([]);
    });

    it('[O] la ficha se guarda como números y es opcional', async () => {
      const { body } = await publicar({
        tipo: 'receta',
        titulo: 'Crema de albahaca',
        mensaje: 'Versátil',
        porciones: '4',
        tiempoMinutos: '19',
        costo: '2',
        calorias: '270',
      }).expect(201);
      const sola = await publicar().expect(201);

      expect(body).toMatchObject({
        porciones: 4,
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
