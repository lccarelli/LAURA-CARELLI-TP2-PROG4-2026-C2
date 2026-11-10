import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp, limpiarBase } from './ayudas/app.js';
import { registrarYObtenerSesion } from './ayudas/datos.js';

describe('POST /auth/refrescar', () => {
  let app: INestApplication;
  let token: string;
  let usuarioId: string;

  const refrescar = (tokenUsado: string | undefined = token) => {
    const solicitud = request(app.getHttpServer()).post('/auth/refrescar');
    if (tokenUsado) {
      solicitud.set('Authorization', `Bearer ${tokenUsado}`);
    }
    return solicitud;
  };
  const vigencia: jwt.SignOptions = { expiresIn: '10m' };
  const firmar = (
    datos: Record<string, unknown>,
    opciones = vigencia,
    secreto = process.env.JWT_SECRET!,
  ) =>
    jwt.sign(
      { sub: usuarioId, perfil: 'usuario', ...datos },
      secreto,
      opciones,
    );
  const decodificar = (valor: string) => jwt.decode(valor) as jwt.JwtPayload;

  beforeAll(async () => {
    app = await crearApp();
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

  it('[O] devuelve un token nuevo del mismo usuario que dura otros 15 minutos', async () => {
    const { body } = await refrescar().expect(200);

    const payload = decodificar(body.token);
    expect(payload.sub).toBe(usuarioId);
    expect(payload.perfil).toBe('usuario');
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
  });

  it('[O] el token nuevo sirve para seguir usando la API', async () => {
    const { body } = await refrescar().expect(200);

    await request(app.getHttpServer())
      .get('/publicaciones')
      .set('Authorization', `Bearer ${body.token}`)
      .expect(200);
  });

  it('[S] al refrescar varias veces el inicio de la sesión no cambia', async () => {
    const inicio = decodificar(token).inicio;
    let actual = token;

    for (let vez = 0; vez < 3; vez++) {
      const { body } = await refrescar(actual).expect(200);
      actual = body.token;
    }

    expect(decodificar(actual).inicio).toBe(inicio);
  });

  it('[I] el body del pedido no puede cambiar el perfil', async () => {
    const { body } = await refrescar()
      .send({ perfil: 'administrador', sub: 'otro' })
      .expect(200);

    expect(decodificar(body.token).perfil).toBe('usuario');
    expect(decodificar(body.token).sub).toBe(usuarioId);
  });

  it('[B] un token anterior, sin inicio, se acepta usando su fecha de emisión', async () => {
    const { body } = await refrescar(firmar({})).expect(200);

    expect(decodificar(body.token).inicio).toBeDefined();
  });

  it('[B] una sesión de justo menos de 12 horas se puede refrescar y una de más no', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    const doceHoras = 12 * 60 * 60;

    await refrescar(firmar({ inicio: ahora - doceHoras + 30 })).expect(200);
    const { body } = await refrescar(
      firmar({ inicio: ahora - doceHoras - 30 }),
    ).expect(401);

    expect(body.codigo).toBe('SESION_VENCIDA');
  });

  it('[E] sin token responde 401 TOKEN_AUSENTE', async () => {
    const { body } = await refrescar('').expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });

  it('[E] un token vencido responde 401 TOKEN_INVALIDO y no se puede refrescar', async () => {
    const vencido = firmar({}, { expiresIn: -10 });

    const { body } = await refrescar(vencido).expect(401);

    expect(body.codigo).toBe('TOKEN_INVALIDO');
  });

  it('[E] un token mal formado o firmado con otro secreto responde 401', async () => {
    await refrescar('esto-no-es-un-token').expect(401);
    await refrescar(firmar({}, { expiresIn: '10m' }, 'otro-secreto')).expect(
      401,
    );
  });
});
