import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { cloudinaryFalso, crearApp, limpiarBase } from './ayudas/app.js';
import {
  PNG,
  URL_IMAGEN_SUBIDA,
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';

const PORTADA = 'https://res.cloudinary.com/prueba/portada-vieja.png';
const FOTO_A = 'https://res.cloudinary.com/prueba/paso-a.png';
const FOTO_B = 'https://res.cloudinary.com/prueba/paso-b.png';
const FOTO_C = 'https://res.cloudinary.com/prueba/paso-c.png';
const ID_INEXISTENTE = '64b7f0c2a1b2c3d4e5f60718';

describe('PUT /publicaciones/:id', () => {
  let app: INestApplication;
  let publicaciones: Model<Publicacion>;
  let token: string;
  let usuarioId: string;
  let id: string;

  const sembrarReceta = async () => {
    const creada = await publicaciones.create({
      usuario: usuarioId,
      tipo: 'receta',
      titulo: 'Tarta vieja',
      mensaje: 'Mensaje viejo',
      imagen: PORTADA,
      porciones: 4,
      tipoRinde: 'porciones',
      tiempoMinutos: 30,
      costo: 2,
      calorias: 300,
      ingredientes: [{ nombre: 'harina', cantidad: 200, unidad: 'g' }],
      pasos: [
        { titulo: 'Masa', texto: 'Mezclar', imagenes: [FOTO_A, FOTO_B] },
        { texto: 'Hornear', imagenes: [FOTO_C] },
      ],
      cantidadMeGusta: 3,
      cantidadComentarios: 2,
    });
    return String(creada._id);
  };

  type Cambios = Record<string, string>;
  const editar = (
    cambios: Cambios,
    { fotos = 0, tokenUsado = token, idUsado = id } = {},
  ) => {
    const solicitud = request(app.getHttpServer())
      .put(`/publicaciones/${idUsado}`)
      .set('Authorization', `Bearer ${tokenUsado}`);
    for (const [campo, valor] of Object.entries(cambios)) {
      solicitud.field(campo, valor);
    }
    for (let i = 0; i < fotos; i++) {
      solicitud.attach('imagenesPasos', PNG, {
        filename: `nueva-${i}.png`,
        contentType: 'image/png',
      });
    }
    return solicitud;
  };
  const basicos: Cambios = { titulo: 'Tarta nueva', mensaje: 'Mensaje nuevo' };
  const conPasos = (pasos: unknown, extra: Cambios = {}) => ({
    ...basicos,
    pasos: JSON.stringify(pasos),
    ...extra,
  });
  const guardada = () => publicaciones.findById(id).lean();

  beforeAll(async () => {
    app = await crearApp();
    publicaciones = app.get(getModelToken(Publicacion.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    const sesion = await registrarYObtenerSesion(app);
    token = sesion.token;
    usuarioId = sesion.usuario._id;
    id = await sembrarReceta();
    cloudinaryFalso.subir.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('datos básicos', () => {
    it('[O] cambia el título y el mensaje, y marca la fecha de edición', async () => {
      const { body } = await editar(basicos).expect(200);

      expect(body.titulo).toBe('Tarta nueva');
      expect(body.mensaje).toBe('Mensaje nuevo');
      expect(body.fechaEdicion).toEqual(expect.any(String));
      expect(body.usuario.nombreUsuario).toBe('laura_c');
    });

    it('[O] no cambia el tipo, la autoría, la fecha ni los contadores', async () => {
      const antes = await guardada();

      const { body } = await editar(basicos).expect(200);

      expect(body.tipo).toBe('receta');
      expect(String(body.usuario._id)).toBe(usuarioId);
      expect(new Date(body.fecha)).toEqual(antes!.fecha);
      expect(body.cantidadMeGusta).toBe(3);
      expect(body.cantidadComentarios).toBe(2);
    });

    it('[S] los cambios quedan guardados y se ven al consultar la publicación', async () => {
      await editar(basicos).expect(200);

      const { body } = await request(app.getHttpServer())
        .get(`/publicaciones/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(body.titulo).toBe('Tarta nueva');
    });

    it('[S] el listado y la búsqueda muestran el título nuevo enseguida', async () => {
      const listar = (consulta: string) =>
        request(app.getHttpServer())
          .get(`/publicaciones${consulta}`)
          .set('Authorization', `Bearer ${token}`);
      await listar('').expect(200);

      await editar(basicos).expect(200);

      expect((await listar('')).body.datos[0].titulo).toBe('Tarta nueva');
      expect((await listar('?q=nueva')).body.datos).toHaveLength(1);
      expect((await listar('?q=vieja')).body.datos).toHaveLength(0);
    });

    it('[E] el tipo no se puede cambiar: mandarlo responde 400', async () => {
      await editar({ ...basicos, tipo: 'tip' }).expect(400);

      expect((await guardada())!.tipo).toBe('receta');
    });
  });

  describe('ficha e ingredientes', () => {
    it('[O] reemplaza la ficha con lo que se manda', async () => {
      await editar({
        ...basicos,
        porciones: '6',
        tipoRinde: 'unidades',
        tiempoMinutos: '45',
        costo: '3',
        calorias: '500',
      }).expect(200);

      expect(await guardada()).toMatchObject({
        porciones: 6,
        tipoRinde: 'unidades',
        tiempoMinutos: 45,
        costo: 3,
        calorias: 500,
      });
    });

    it('[S] lo que no se manda de la ficha se borra', async () => {
      await editar({ ...basicos, porciones: '6' }).expect(200);

      const { tiempoMinutos, costo, calorias, tipoRinde } = (await guardada())!;
      expect([tiempoMinutos, costo, calorias, tipoRinde]).toEqual([
        undefined,
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('[O] reemplaza los ingredientes y, sin ingredientes, los quita', async () => {
      await editar({
        ...basicos,
        ingredientes: JSON.stringify([{ nombre: 'sal', unidad: 'a_gusto' }]),
      }).expect(200);
      expect((await guardada())!.ingredientes).toEqual([
        { nombre: 'sal', unidad: 'a_gusto' },
      ]);

      await editar(basicos).expect(200);

      expect((await guardada())!.ingredientes).toBeUndefined();
    });
  });

  describe('pasos y fotos', () => {
    it('[O] reescribe los pasos y conserva las fotos que se indican', async () => {
      await editar(
        conPasos([
          { titulo: 'Masa', texto: 'Amasar', imagenes: [FOTO_A] },
          { texto: 'Servir' },
        ]),
      ).expect(200);

      expect((await guardada())!.pasos).toEqual([
        { titulo: 'Masa', texto: 'Amasar', imagenes: [FOTO_A] },
        { texto: 'Servir' },
      ]);
    });

    it('[S] una foto que no se manda en imagenes se quita del paso', async () => {
      await editar(conPasos([{ texto: 'Mezclar', imagenes: [FOTO_B] }])).expect(
        200,
      );

      expect((await guardada())!.pasos).toEqual([
        { texto: 'Mezclar', imagenes: [FOTO_B] },
      ]);
    });

    it('[O] agrega fotos nuevas detrás de las conservadas', async () => {
      await editar(
        conPasos([{ texto: 'Mezclar', imagenes: [FOTO_A], fotos: [0] }]),
        { fotos: 1 },
      ).expect(200);

      expect((await guardada())!.pasos).toEqual([
        { texto: 'Mezclar', imagenes: [FOTO_A, URL_IMAGEN_SUBIDA] },
      ]);
      expect(cloudinaryFalso.subir).toHaveBeenCalledTimes(1);
    });

    it('[O] un paso sin descripción ni título se queda con sólo su foto', async () => {
      await editar(conPasos([{ imagenes: [FOTO_C] }])).expect(200);

      expect((await guardada())!.pasos).toEqual([{ imagenes: [FOTO_C] }]);
    });

    it('[S] sin pasos en el pedido los pasos se quitan', async () => {
      await editar(basicos).expect(200);

      expect((await guardada())!.pasos).toBeUndefined();
    });

    it.each([
      [
        'una foto que no es de esta publicación',
        [{ texto: 'a', imagenes: ['https://otra.test/x.png'] }],
        0,
      ],
      [
        'la misma foto en dos pasos',
        [
          { texto: 'a', imagenes: [FOTO_A] },
          { texto: 'b', imagenes: [FOTO_A] },
        ],
        0,
      ],
      ['un número de foto sin archivo', [{ texto: 'a', fotos: [1] }], 1],
      [
        'más de 5 fotos entre conservadas y nuevas',
        [{ texto: 'a', imagenes: [FOTO_A, FOTO_B], fotos: [0, 1, 2, 3] }],
        4,
      ],
      ['un paso vacío', [{}], 0],
    ])(
      '[E] %s responde 400 y no cambia nada',
      async (_nombre, pasos, fotos) => {
        const antes = await guardada();

        await editar(conPasos(pasos), { fotos }).expect(400);

        expect(await guardada()).toEqual(antes);
      },
    );
  });

  describe('portada', () => {
    const conPortada = (extra: Cambios = {}) =>
      editar({ ...basicos, ...extra }).attach('imagen', PNG, {
        filename: 'portada.png',
        contentType: 'image/png',
      });

    it('[O] sin imagen en el pedido se conserva la portada', async () => {
      await editar(basicos).expect(200);

      expect((await guardada())!.imagen).toBe(PORTADA);
    });

    it('[O] una imagen nueva reemplaza la portada', async () => {
      await conPortada().expect(200);

      expect((await guardada())!.imagen).toBe(URL_IMAGEN_SUBIDA);
    });

    it('[O] quitarImagen elimina la portada', async () => {
      await editar({ ...basicos, quitarImagen: 'true' }).expect(200);

      expect((await guardada())!.imagen).toBeUndefined();
    });

    it('[B] si llegan una imagen nueva y quitarImagen, gana la imagen nueva', async () => {
      await conPortada({ quitarImagen: 'true' }).expect(200);

      expect((await guardada())!.imagen).toBe(URL_IMAGEN_SUBIDA);
    });

    it('[E] un archivo que no es imagen responde 400', async () => {
      await editar(basicos)
        .attach('imagen', Buffer.from('texto'), {
          filename: 'nota.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('[E] quitarImagen con otro valor responde 400', async () => {
      await editar({ ...basicos, quitarImagen: 'quizas' }).expect(400);
    });
  });

  describe('validación', () => {
    it.each([
      ['sin título', { mensaje: 'Algo' }],
      ['con el título vacío', { titulo: '   ', mensaje: 'Algo' }],
      [
        'con un título de 56 caracteres',
        { titulo: 'a'.repeat(56), mensaje: 'Algo' },
      ],
      ['sin mensaje', { titulo: 'Algo' }],
      [
        'con un mensaje de 2001 caracteres',
        { titulo: 'Algo', mensaje: 'a'.repeat(2001) },
      ],
      ['con una ficha fuera de rango', { ...basicos, porciones: '101' }],
      ['con un campo desconocido', { ...basicos, usuario: 'otro' }],
    ])('[E] %s responde 400', async (_nombre, cambios) => {
      await editar(cambios).expect(400);

      expect((await guardada())!.titulo).toBe('Tarta vieja');
    });

    it('[B] acepta un título de 55 caracteres y un mensaje de 2000', async () => {
      await editar({
        titulo: 'a'.repeat(55),
        mensaje: 'b'.repeat(2000),
      }).expect(200);
    });
  });

  describe('permisos', () => {
    it('[E] otra persona no puede editarla: 403 PUBLICACION_AJENA y no cambia', async () => {
      const otra = await registrarOtraPersona(app);

      const { body } = await editar(basicos, { tokenUsado: otra.token }).expect(
        403,
      );

      expect(body.codigo).toBe('PUBLICACION_AJENA');
      expect((await guardada())!.titulo).toBe('Tarta vieja');
    });

    it('[E] una publicación eliminada responde 404', async () => {
      await publicaciones.updateOne({ _id: id }, { activa: false });

      await editar(basicos).expect(404);
    });

    it('[E] una publicación que no existe responde 404', async () => {
      const { body } = await editar(basicos, {
        idUsado: ID_INEXISTENTE,
      }).expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] un id inválido responde 400', async () => {
      await editar(basicos, { idUsado: 'abc' }).expect(400);
    });

    it('[E] sin token responde 401', async () => {
      await request(app.getHttpServer())
        .put(`/publicaciones/${id}`)
        .field('titulo', 'x')
        .field('mensaje', 'y')
        .expect(401);
    });
  });
});
