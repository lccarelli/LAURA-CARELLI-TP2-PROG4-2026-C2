import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { ETIQUETAS } from '../src/etiquetas-swagger.js';
import { crearDocumento } from '../src/swagger.js';
import { crearApp } from './ayudas/app.js';

type Operacion = {
  summary?: string;
  tags?: string[];
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

  it('[I] cada endpoint pertenece a un único grupo declarado y con descripción', () => {
    const declarados = new Map(
      documento.tags?.map((etiqueta) => [etiqueta.name, etiqueta.description]),
    );
    const mal = Object.entries(documento.paths).flatMap(([ruta, metodos]) =>
      Object.entries(metodos as Record<string, Operacion>)
        .filter(
          ([, { tags = [] }]) => tags.length !== 1 || !declarados.get(tags[0]),
        )
        .map(([metodo]) => `${metodo.toUpperCase()} ${ruta}`),
    );

    expect(mal).toEqual([]);
  });

  it('[I] los grupos se muestran en el orden pensado para leer la API', () => {
    expect(documento.tags?.map((etiqueta) => etiqueta.name)).toEqual(
      Object.values(ETIQUETAS).map(({ nombre }) => nombre),
    );
  });

  it('[I] los endpoints de me gusta, comentarios, guardadas y compartidas van en su propio grupo', () => {
    expect(operacion('/publicaciones/{id}/megusta', 'post').tags).toEqual([
      ETIQUETAS.meGusta.nombre,
    ]);
    expect(operacion('/publicaciones/{id}/comentarios', 'post').tags).toEqual([
      ETIQUETAS.comentarios.nombre,
    ]);
    expect(operacion('/publicaciones/{id}/guardar', 'post').tags).toEqual([
      ETIQUETAS.guardadas.nombre,
    ]);
    expect(operacion('/publicaciones/{id}/compartir', 'post').tags).toEqual([
      ETIQUETAS.compartidas.nombre,
    ]);
  });

  it('[I] mi perfil y el de otra persona comparten grupo; la administración va aparte', () => {
    expect(operacion('/usuarios/yo', 'put').tags).toEqual([
      ETIQUETAS.perfiles.nombre,
    ]);
    expect(operacion('/usuarios/{id}', 'get').tags).toEqual([
      ETIQUETAS.perfiles.nombre,
    ]);
    expect(operacion('/usuarios', 'get').tags).toEqual([
      ETIQUETAS.administracion.nombre,
    ]);
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
    ]) {
      expect(
        Object.keys(operacion(ruta, metodo).requestBody?.content ?? {}),
        `${metodo} ${ruta}`,
      ).toContain('multipart/form-data');
    }
  });
});
