import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Usuario } from '../src/usuarios/schemas/usuario.schema.js';
import { datosDeLaCuentaDocente } from '../src/usuarios/cuenta-docente.js';
import { UsuariosService } from '../src/usuarios/usuarios.service.js';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';

describe('sembrar la cuenta docente', () => {
  let app: INestApplication;
  let usuarios: Model<Usuario>;

  const datos = (clave = 'ClaveUsada1') =>
    datosDeLaCuentaDocente({ DOCENTE_CLAVE: clave });
  const sembrar = (clave?: string) =>
    app.get(UsuariosService).asegurarCuentaDeAdministrador(datos(clave));
  const ingresar = (clave: string) =>
    request(app.getHttpServer())
      .post('/auth/ingresar')
      .send({ identificador: 'docente@administrador.com', clave });

  beforeAll(async () => {
    app = await crearApp();
    usuarios = app.get(getModelToken(Usuario.name));
  });

  beforeEach(async () => {
    await limpiarBase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[O] crea la cuenta con perfil administrador y la clave indicada', async () => {
    const { accion } = await sembrar();

    expect(accion).toBe('creada');
    const { body } = await ingresar('ClaveUsada1').expect(200);
    expect(body.usuario).toMatchObject({
      correo: 'docente@administrador.com',
      nombreUsuario: 'docente',
      perfil: 'administrador',
      habilitado: true,
    });
  });

  it('[S] la cuenta sirve para entrar a las rutas de administrador', async () => {
    await sembrar();
    const { body } = await ingresar('ClaveUsada1').expect(200);

    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${body.token}`)
      .expect(200);
  });

  it('[S] la clave queda guardada con bcrypt, no en texto', async () => {
    await sembrar();

    const guardado = await usuarios
      .findOne({ correo: 'docente@administrador.com' })
      .select('+clave')
      .lean();

    expect(guardado!.clave).not.toBe('ClaveUsada1');
    expect(guardado!.clave).toMatch(/^\$2[aby]\$10\$/);
  });

  it('[B] correrlo dos veces no duplica la cuenta: la segunda la actualiza', async () => {
    await sembrar();

    const { accion } = await sembrar('OtraClave1');

    expect(accion).toBe('actualizada');
    expect(
      await usuarios.countDocuments({ correo: 'docente@administrador.com' }),
    ).toBe(1);
    await ingresar('ClaveUsada1').expect(401);
    await ingresar('OtraClave1').expect(200);
  });

  it('[S] si la cuenta existía como común, la promueve a administrador', async () => {
    await registrarYObtenerSesion(app, {
      correo: 'docente@administrador.com',
      nombreUsuario: 'docente',
    });

    const { accion } = await sembrar();

    expect(accion).toBe('actualizada');
    const { body } = await ingresar('ClaveUsada1').expect(200);
    expect(body.usuario.perfil).toBe('administrador');
  });

  it('[S] si la cuenta estaba deshabilitada, la vuelve a habilitar', async () => {
    await sembrar();
    await usuarios.updateOne(
      { correo: 'docente@administrador.com' },
      { habilitado: false },
    );

    await sembrar();

    await ingresar('ClaveUsada1').expect(200);
  });

  it('[E] si el usuario «docente» ya es de otra persona, no crea nada y avisa', async () => {
    await registrarYObtenerSesion(app, { nombreUsuario: 'docente' });

    await expect(sembrar()).rejects.toMatchObject({
      response: { codigo: 'USUARIO_REPETIDO' },
    });
    expect(
      await usuarios.countDocuments({ correo: 'docente@administrador.com' }),
    ).toBe(0);
  });
});
