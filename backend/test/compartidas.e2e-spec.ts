import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Compartida } from '../src/publicaciones/schemas/compartida.schema.js';
import { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';

type Sesion = { token: string; usuario: { _id: string } };

describe('compartir publicaciones', () => {
  let app: INestApplication;
  let compartidas: Model<Compartida>;
  let publicaciones: Model<Publicacion>;
  let usuarios: Model<Usuario>;
  let yo: Sesion;
  let juan: Sesion;
  let ana: Sesion;
  let idPublicacion: string;

  const con = (token: string, metodo: 'get' | 'post', ruta: string) =>
    request(app.getHttpServer())
      [metodo](ruta)
      .set('Authorization', `Bearer ${token}`);

  const compartir = (
    usuariosIds: unknown,
    id = idPublicacion,
    token = yo.token,
  ) =>
    con(token, 'post', `/publicaciones/${id}/compartir`).send({
      usuarios: usuariosIds,
    });

  beforeAll(async () => {
    app = await crearApp();
    compartidas = app.get(getModelToken(Compartida.name));
    publicaciones = app.get(getModelToken(Publicacion.name));
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    yo = await registrarYObtenerSesion(app);
    juan = await registrarOtraPersona(app);
    ana = await registrarYObtenerSesion(app, {
      correo: 'ana@correo.com',
      nombreUsuario: 'ana_g',
      nombre: 'Ana',
      apellido: 'Gómez',
    });
    const { body } = await con(yo.token, 'post', '/publicaciones')
      .send({
        titulo: 'Tarta de manzana',
        tipo: 'receta',
        mensaje: 'Rica y simple',
      })
      .expect(201);
    idPublicacion = body._id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /publicaciones/:id/compartir', () => {
    it('[O] comparte con varias personas a la vez y guarda un registro por cada una', async () => {
      const { body } = await compartir([
        juan.usuario._id,
        ana.usuario._id,
      ]).expect(201);

      const guardadas = await compartidas
        .find({ publicacion: idPublicacion })
        .lean();

      expect(body).toEqual({
        compartida: true,
        destinatarios: 2,
        cantidadCompartidas: 2,
      });
      expect(guardadas).toHaveLength(2);
      expect(guardadas.every(({ de }) => String(de) === yo.usuario._id)).toBe(
        true,
      );
    });

    it('[S] se puede compartir la misma publicación a la misma persona las veces que se quiera', async () => {
      await compartir([juan.usuario._id]).expect(201);
      const { body } = await compartir([juan.usuario._id]).expect(201);

      expect(body.cantidadCompartidas).toBe(2);
      expect(await compartidas.countDocuments({ a: juan.usuario._id })).toBe(2);
    });

    it('[S] cualquiera puede compartir una publicación ajena', async () => {
      await compartir([yo.usuario._id], idPublicacion, juan.token).expect(201);
    });

    it('[B] con 20 personas funciona y con 21 responde 400', async () => {
      const ids = Array.from(
        { length: 21 },
        (_, i) => `64b64b64b64b64b64b64b6${String(i).padStart(2, '0')}`,
      );

      await compartir(ids).expect(400);
    });

    it.each([
      ['sin personas', []],
      ['sin el campo', undefined],
      ['con un id inválido', ['abc']],
      [
        'con personas repetidas',
        ['64b64b64b64b64b64b64b64b', '64b64b64b64b64b64b64b64b'],
      ],
      ['con algo que no es una lista', 'abc'],
    ])('[E] %s responde 400', async (_caso, valor) => {
      await compartir(valor).expect(400);
      expect(await compartidas.countDocuments()).toBe(0);
    });

    it('[E] compartir con uno mismo responde 400 COMPARTIR_CON_UNO_MISMO y no guarda nada', async () => {
      const { body } = await compartir([
        juan.usuario._id,
        yo.usuario._id,
      ]).expect(400);

      expect(body.codigo).toBe('COMPARTIR_CON_UNO_MISMO');
      expect(await compartidas.countDocuments()).toBe(0);
    });

    it('[E] si una de las personas no existe responde 404 y no comparte con ninguna', async () => {
      const { body } = await compartir([
        juan.usuario._id,
        '64b64b64b64b64b64b64b64b',
      ]).expect(404);

      expect(body.codigo).toBe('USUARIO_NO_ENCONTRADO');
      expect(await compartidas.countDocuments()).toBe(0);
    });

    it('[E] una persona deshabilitada responde 404', async () => {
      await usuarios.updateOne(
        { _id: juan.usuario._id },
        { habilitado: false },
      );

      await compartir([juan.usuario._id]).expect(404);
    });

    it('[E] una publicación que no existe o fue eliminada responde 404 PUBLICACION_NO_ENCONTRADA', async () => {
      await publicaciones.updateOne({ _id: idPublicacion }, { activa: false });

      const { body } = await compartir([juan.usuario._id]).expect(404);

      expect(body.codigo).toBe('PUBLICACION_NO_ENCONTRADA');
    });

    it('[E] un id de publicación inválido responde 400', async () => {
      await compartir([juan.usuario._id], 'abc').expect(400);
    });

    it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/publicaciones/${idPublicacion}/compartir`)
        .send({ usuarios: [juan.usuario._id] })
        .expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
    });
  });

  describe('GET /publicaciones/compartidas', () => {
    it('[O] lista lo que me compartieron, con quién lo compartió y cuándo', async () => {
      await compartir([juan.usuario._id]).expect(201);

      const { body } = await con(
        juan.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);

      expect(body).toMatchObject({ offset: 0, limit: 10, hayMas: false });
      expect(body.datos).toHaveLength(1);
      expect(body.datos[0]).toMatchObject({
        _id: idPublicacion,
        titulo: 'Tarta de manzana',
        compartidaPor: { nombreUsuario: 'laura_c' },
        meGusta: false,
        guardada: false,
      });
      expect(body.datos[0].fechaCompartida).toEqual(expect.any(String));
      expect(body.datos[0].compartidaPor.clave).toBeUndefined();
      expect(body.datos[0].compartidaPor.correo).toBeUndefined();
    });

    it('[Z] sin nada compartido devuelve la lista vacía', async () => {
      const { body } = await con(
        ana.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);

      expect(body).toMatchObject({ datos: [], hayMas: false });
    });

    it('[S] sólo lista lo compartido conmigo, no lo que compartí ni lo de otras personas', async () => {
      await compartir([juan.usuario._id]).expect(201);

      const mia = await con(
        yo.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);
      const deAna = await con(
        ana.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);

      expect(mia.body.datos).toHaveLength(0);
      expect(deAna.body.datos).toHaveLength(0);
    });

    it('[S] la misma publicación compartida dos veces aparece dos veces, la más reciente primero', async () => {
      await compartir([juan.usuario._id]).expect(201);
      await compartir([juan.usuario._id], idPublicacion, ana.token).expect(201);

      const { body } = await con(
        juan.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);

      expect(body.datos).toHaveLength(2);
      expect(body.datos[0].compartidaPor.nombreUsuario).toBe('ana_g');
      expect(body.datos[1].compartidaPor.nombreUsuario).toBe('laura_c');
    });

    it('[S] una publicación eliminada deja de aparecer', async () => {
      await compartir([juan.usuario._id]).expect(201);
      await publicaciones.updateOne({ _id: idPublicacion }, { activa: false });

      const { body } = await con(
        juan.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);

      expect(body.datos).toHaveLength(0);
    });

    it('[S] refleja mis me gusta y guardadas', async () => {
      await compartir([juan.usuario._id]).expect(201);
      await con(
        juan.token,
        'post',
        `/publicaciones/${idPublicacion}/guardar`,
      ).expect(201);

      const { body } = await con(
        juan.token,
        'get',
        '/publicaciones/compartidas',
      ).expect(200);

      expect(body.datos[0].guardada).toBe(true);
    });

    it('[B] pagina con limit y offset e indica si hay más', async () => {
      await compartir([juan.usuario._id]).expect(201);
      await compartir([juan.usuario._id]).expect(201);
      await compartir([juan.usuario._id]).expect(201);

      const primera = await con(
        juan.token,
        'get',
        '/publicaciones/compartidas?limit=2',
      ).expect(200);
      const segunda = await con(
        juan.token,
        'get',
        '/publicaciones/compartidas?limit=2&offset=2',
      ).expect(200);

      expect(primera.body.datos).toHaveLength(2);
      expect(primera.body.hayMas).toBe(true);
      expect(segunda.body.datos).toHaveLength(1);
      expect(segunda.body.hayMas).toBe(false);
    });

    it('[E] sin token responde 401', async () => {
      await request(app.getHttpServer())
        .get('/publicaciones/compartidas')
        .expect(401);
    });

    it('[I] no choca con la ruta de una publicación por id', async () => {
      await con(yo.token, 'get', `/publicaciones/${idPublicacion}`).expect(200);
    });
  });

  describe('GET /usuarios/directorio', () => {
    const buscar = (texto: string, token = yo.token) =>
      con(
        token,
        'get',
        `/usuarios/directorio?texto=${encodeURIComponent(texto)}`,
      );

    it('[O] busca por nombre, apellido o usuario, sin importar mayúsculas ni tildes', async () => {
      const porNombre = await buscar('ana').expect(200);
      const porApellido = await buscar('gomez').expect(200);
      const porUsuario = await buscar('JUAN_P').expect(200);

      expect(
        porNombre.body.datos.map(
          (u: { nombreUsuario: string }) => u.nombreUsuario,
        ),
      ).toEqual(['ana_g']);
      expect(porApellido.body.datos).toHaveLength(1);
      expect(porUsuario.body.datos[0].nombreUsuario).toBe('juan_p');
    });

    it('[I] sólo devuelve datos públicos: nunca correo, clave, fecha de nacimiento ni perfil', async () => {
      const { body } = await buscar('ana').expect(200);

      expect(Object.keys(body.datos[0])).toEqual(
        expect.arrayContaining(['_id', 'apellido', 'nombre', 'nombreUsuario']),
      );
      expect(Object.keys(body.datos[0])).toHaveLength(4);
    });

    it('[S] no incluye a quien busca', async () => {
      const { body } = await buscar('laura').expect(200);

      expect(
        body.datos.map((u: { nombreUsuario: string }) => u.nombreUsuario),
      ).not.toContain('laura_c');
    });

    it('[S] no incluye personas deshabilitadas', async () => {
      await usuarios.updateOne({ _id: ana.usuario._id }, { habilitado: false });

      const { body } = await buscar('ana').expect(200);

      expect(body.datos).toHaveLength(0);
    });

    it('[B] devuelve como máximo 10 resultados', async () => {
      await usuarios.insertMany(
        Array.from({ length: 12 }, (_, i) => ({
          nombre: 'Persona',
          apellido: `Numero${i}`,
          correo: `p${i}@correo.com`,
          nombreUsuario: `persona_${i}`,
          clave: 'x',
          fechaNacimiento: new Date('1990-01-01'),
          descripcion: 'x',
        })),
      );

      const { body } = await buscar('persona').expect(200);

      expect(body.datos).toHaveLength(10);
    });

    it('[Z] sin coincidencias devuelve la lista vacía', async () => {
      const { body } = await buscar('zzzz').expect(200);

      expect(body.datos).toEqual([]);
    });

    it.each([
      ['de un solo carácter', 'a'],
      ['de más de 60 caracteres', 'a'.repeat(61)],
      ['con más de 5 palabras', 'a1 b2 c3 d4 e5 f6'],
    ])('[E] un texto %s responde 400', async (_caso, texto) => {
      await buscar(texto).expect(400);
    });

    it('[E] sin el texto responde 400', async () => {
      await con(yo.token, 'get', '/usuarios/directorio').expect(400);
    });

    it('[E] sin token responde 401', async () => {
      await request(app.getHttpServer())
        .get('/usuarios/directorio?texto=ana')
        .expect(401);
    });

    it('[I] una persona común puede usarlo (no es sólo de administración)', async () => {
      await buscar('ana', juan.token).expect(200);
    });
  });
});
