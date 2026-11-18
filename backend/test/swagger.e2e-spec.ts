import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { crearDocumento } from '../src/swagger.js';
import { crearApp } from './ayudas/app.js';

type Operacion = {
  summary?: string;
  security?: Record<string, string[]>[];
  requestBody?: { content: Record<string, unknown> };
};

describe('documentación Swagger', () => {
  let app: INestApplication;
  let documento: OpenAPIObject;

  const operacion = (ruta: string, metodo: string) =>
    (documento.paths[ruta] as Record<string, Operacion>)[metodo];

  beforeAll(async () => {
    app = await crearApp();
    documento = crearDocumento(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[Z] el documento declara el esquema de token Bearer', () => {
    expect(documento.components?.securitySchemes).toHaveProperty('bearer');
  });

  it('[M] cada endpoint tiene un resumen', () => {
    const sinResumen = Object.entries(documento.paths).flatMap(
      ([ruta, metodos]) =>
        Object.entries(metodos as Record<string, Operacion>)
          .filter(([, definicion]) => !definicion.summary)
          .map(([metodo]) => `${metodo.toUpperCase()} ${ruta}`),
    );

    expect(sinResumen).toEqual([]);
  });

  it('[I] los endpoints con sesión piden el token', () => {
    expect(operacion('/publicaciones', 'get').security).toEqual([
      { bearer: [] },
    ]);
    expect(operacion('/auth/autorizar', 'post').security).toEqual([
      { bearer: [] },
    ]);
    expect(operacion('/estadisticas/resumen', 'get').security).toEqual([
      { bearer: [] },
    ]);
  });

  it('[I] los endpoints públicos no piden el token', () => {
    expect(operacion('/auth/ingresar', 'post').security).toBeUndefined();
    expect(operacion('/publico/publicaciones', 'get').security).toBeUndefined();
    expect(operacion('/health', 'get').security).toBeUndefined();
  });

  it('[I] los endpoints con archivos se documentan como multipart', () => {
    for (const [ruta, metodo] of [
      ['/auth/registro', 'post'],
      ['/publicaciones', 'post'],
      ['/usuarios/yo', 'put'],
      ['/imagenes', 'post'],
    ]) {
      expect(
        Object.keys(operacion(ruta, metodo).requestBody?.content ?? {}),
        `${metodo} ${ruta}`,
      ).toContain('multipart/form-data');
    }
  });
});
