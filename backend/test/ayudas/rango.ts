import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const hoyEnBuenosAires = () =>
  new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export interface ContextoDeRango {
  app: INestApplication;
  tokenComun: string;
  consultar: (consulta?: string, token?: string) => request.Test;
}

export function probarRangoYPermisos(
  ruta: string,
  contexto: () => ContextoDeRango,
) {
  it('[B] un rango de 366 días se acepta y uno de 367 no', async () => {
    const { consultar } = contexto();
    await consultar('desde=2025-03-01&hasta=2026-03-01').expect(200);

    const { body } = await consultar(
      'desde=2025-02-28&hasta=2026-03-01',
    ).expect(400);

    expect(body.codigo).toBe('RANGO_DEMASIADO_LARGO');
  });

  it('[E] desde posterior a hasta responde 400 RANGO_INVALIDO', async () => {
    const { body } = await contexto()
      .consultar('desde=2026-03-31&hasta=2026-03-01')
      .expect(400);

    expect(body.codigo).toBe('RANGO_INVALIDO');
  });

  it.each([
    ['sin parámetros', ''],
    ['sin hasta', 'desde=2026-03-01'],
    ['sin desde', 'hasta=2026-03-31'],
    ['fecha inexistente', 'desde=2026-02-30&hasta=2026-03-31'],
    ['texto que no es fecha', 'desde=ayer&hasta=hoy'],
    ['fecha con hora', 'desde=2026-03-01T00:00:00Z&hasta=2026-03-31'],
    ['parámetro de más', 'desde=2026-03-01&hasta=2026-03-31&usuario=1'],
  ])('[E] %s responde 400 DATOS_INVALIDOS', async (_caso, consulta) => {
    const { body } = await contexto().consultar(consulta).expect(400);

    expect(body.codigo).toBe('DATOS_INVALIDOS');
  });

  it('[S] una persona común recibe 403 NO_ES_ADMINISTRADOR', async () => {
    const { consultar, tokenComun } = contexto();

    const { body } = await consultar(undefined, tokenComun).expect(403);

    expect(body.codigo).toBe('NO_ES_ADMINISTRADOR');
  });

  it('[S] sin token responde 401 TOKEN_AUSENTE', async () => {
    const { body } = await request(contexto().app.getHttpServer())
      .get(`${ruta}?desde=2026-03-01&hasta=2026-03-31`)
      .expect(401);

    expect(body.codigo).toBe('TOKEN_AUSENTE');
  });
}
