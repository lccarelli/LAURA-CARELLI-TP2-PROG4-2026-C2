import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module.js';
import { aplicarValidacionGlobal } from '../../src/validacion-global.js';

export async function crearApp(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication();
  aplicarValidacionGlobal(app);
  await app.init();
  return app;
}

export async function limpiarBase(app: INestApplication) {
  const conexion = app.get<Connection>(getConnectionToken());
  const colecciones = Object.values(conexion.collections);
  await Promise.all(colecciones.map((coleccion) => coleccion.deleteMany({})));
}
