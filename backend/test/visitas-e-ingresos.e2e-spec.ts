import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Ingreso } from '../src/auth/schemas/ingreso.schema.js';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { Visita } from '../src/usuarios/schemas/visita.schema.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import {
  registrarOtraPersona,
  registrarYObtenerSesion,
} from './ayudas/datos.js';

describe('visitas al perfil e ingresos', () => {
  let app: INestApplication;
  let visitas: Model<Visita>;
  let ingresos: Model<Ingreso>;
  let usuarios: Model<Usuario>;
  let yo: { token: string; usuario: { _id: string } };
  let otra: { token: string; usuario: { _id: string } };

  const visitar = (id: string, token: string | null = yo.token) => {
    const solicitud = request(app.getHttpServer()).post(
      `/usuarios/${id}/visitas`,
    );
    return token
      ? solicitud.set('Authorization', `Bearer ${token}`)
      : solicitud;
  };

  const ingresar = (identificador: string, clave = 'Clave1234') =>
    request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador, clave });

  beforeAll(async () => {
    app = await crearApp();
    visitas = app.get(getModelToken(Visita.name));
    ingresos = app.get(getModelToken(Ingreso.name));
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
    yo = await registrarYObtenerSesion(app);
    otra = await registrarOtraPersona(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /usuarios/:id/visitas', () => {
    it('[O] registra la visita con quién visita, a quién y cuándo, y responde 201', async () => {
      const { body } = await visitar(otra.usuario._id).expect(201);

      const guardadas = await visitas.find().lean();

      expect(body).toEqual({ registrada: true });
      expect(guardadas).toHaveLength(1);
      expect(String(guardadas[0].visitante)).toBe(yo.usuario._id);
      expect(String(guardadas[0].visitado)).toBe(otra.usuario._id);
      expect(guardadas[0].fecha).toBeInstanceOf(Date);
    });

    it('[S] cada visita cuenta: dos visitas al mismo perfil son dos registros', async () => {
      await visitar(otra.usuario._id).expect(201);
      await visitar(otra.usuario._id).expect(201);

      expect(await visitas.countDocuments()).toBe(2);
    });

    it('[E] visitar el propio perfil responde 400 VISITA_PROPIA y no registra nada', async () => {
      const { body } = await visitar(yo.usuario._id).expect(400);

      expect(body.codigo).toBe('VISITA_PROPIA');
      expect(await visitas.countDocuments()).toBe(0);
    });

    it('[E] una persona deshabilitada responde 404 y no registra nada', async () => {
      await usuarios.updateOne(
        { _id: otra.usuario._id },
        { habilitado: false },
      );

      const { body } = await visitar(otra.usuario._id).expect(404);

      expect(body.codigo).toBe('USUARIO_NO_ENCONTRADO');
      expect(await visitas.countDocuments()).toBe(0);
    });

    it.each([
      ['no existe', '64b64b64b64b64b64b64b64b', 404],
      ['tiene un id inválido', 'abc', 400],
    ])('[E] un usuario que %s responde %i', async (_caso, id, estado) => {
      await visitar(id).expect(estado);
      expect(await visitas.countDocuments()).toBe(0);
    });

    it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
      const { body } = await visitar(otra.usuario._id, null).expect(401);

      expect(body.codigo).toBe('TOKEN_AUSENTE');
    });
  });

  describe('ingresos', () => {
    it('[O] cada ingreso correcto registra quién ingresó y cuándo', async () => {
      await ingresar('laura_c').expect(200);

      const guardados = await ingresos.find().lean();

      expect(guardados).toHaveLength(1);
      expect(String(guardados[0].usuario)).toBe(yo.usuario._id);
      expect(guardados[0].fecha).toBeInstanceOf(Date);
    });

    it('[S] ingresar dos veces registra dos ingresos', async () => {
      await ingresar('laura_c').expect(200);
      await ingresar('laura_c').expect(200);

      expect(await ingresos.countDocuments({ usuario: yo.usuario._id })).toBe(
        2,
      );
    });

    it('[S] el registro de la cuenta no cuenta como ingreso', async () => {
      expect(await ingresos.countDocuments()).toBe(0);
    });

    it('[E] una clave incorrecta no registra ningún ingreso', async () => {
      await ingresar('laura_c', 'Equivocada1').expect(401);

      expect(await ingresos.countDocuments()).toBe(0);
    });

    it('[E] si no se puede guardar el ingreso, igual se entra', async () => {
      const crear = vi
        .spyOn(ingresos, 'create')
        .mockRejectedValueOnce(new Error('base caída') as never);

      const { body } = await ingresar('laura_c').expect(200);

      expect(body.token).toEqual(expect.any(String));
      expect(crear).toHaveBeenCalled();
      crear.mockRestore();
    });
  });
});
