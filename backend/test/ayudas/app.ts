import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module.js';
import { LimiteSolicitudesGuard } from '../../src/common/limite-solicitudes.guard.js';
import type { Destino } from '../../src/imagenes/destinos.js';
import { CloudinaryCliente } from '../../src/imagenes/cloudinary.cliente.js';
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

export async function crearApp(conLimites = false): Promise<INestApplication> {
  let constructor = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CloudinaryCliente)
    .useValue(cloudinaryFalso);
  if (!conLimites) {
    constructor = constructor
      .overrideProvider(LimiteSolicitudesGuard)
      .useValue({ canActivate: () => true });
  }
  const modulo = await constructor.compile();
  const app = modulo.createNestApplication();
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
