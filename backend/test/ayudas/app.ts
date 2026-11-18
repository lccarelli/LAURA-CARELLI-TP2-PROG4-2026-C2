import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module.js';
import { LimiteSolicitudesGuard } from '../../src/common/limite-solicitudes.guard.js';
import type { Destino } from '../../src/imagenes/destinos.js';
import { CloudinaryCliente } from '../../src/imagenes/cloudinary.cliente.js';
import { ClienteWebPush } from '../../src/push/cliente-web-push.js';
import { aplicarSeguridadGlobal } from '../../src/seguridad-global.js';
import { aplicarValidacionGlobal } from '../../src/validacion-global.js';
import { PUBLIC_ID_IMAGEN_SUBIDA, URL_IMAGEN_SUBIDA } from './datos.js';

export const cloudinaryFalso = {
  subir: vi.fn(
    async (
      _archivo: Express.Multer.File,
      _destino: Destino,
      _nombre: string,
    ) => ({
      url: URL_IMAGEN_SUBIDA,
      publicId: PUBLIC_ID_IMAGEN_SUBIDA,
    }),
  ),
  borrar: vi.fn(async (_publicId: string) => undefined),
};

export const webPushFalso = {
  habilitado: true,
  clavePublica: 'clave-publica-de-prueba',
  enviar: vi.fn(async (_destino: object, _contenido: object) => undefined),
};

export async function crearApp(
  conLimites = false,
  personalizar: (constructor: TestingModuleBuilder) => TestingModuleBuilder = (
    constructor,
  ) => constructor,
): Promise<INestApplication> {
  let constructor = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CloudinaryCliente)
    .useValue(cloudinaryFalso)
    .overrideProvider(ClienteWebPush)
    .useValue(webPushFalso);
  if (!conLimites) {
    constructor = constructor
      .overrideProvider(LimiteSolicitudesGuard)
      .useValue({ canActivate: () => true });
  }
  const modulo = await personalizar(constructor).compile();
  const app = modulo.createNestApplication();
  aplicarSeguridadGlobal(app);
  aplicarValidacionGlobal(app);
  await app.init();
  const conexion = app.get<Connection>(getConnectionToken());
  await Promise.all(
    Object.values(conexion.models).map((modelo) => modelo.init()),
  );
  return app;
}

export async function limpiarBase(app: INestApplication) {
  cloudinaryFalso.subir.mockClear();
  cloudinaryFalso.borrar.mockClear();
  await app.get<Cache>(CACHE_MANAGER, { strict: false }).clear();
  const conexion = app.get<Connection>(getConnectionToken());
  const colecciones = Object.values(conexion.collections);
  await Promise.all(colecciones.map((coleccion) => coleccion.deleteMany({})));
}
