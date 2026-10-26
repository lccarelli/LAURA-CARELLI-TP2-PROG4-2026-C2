import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export function pngDeTamano(bytes: number) {
  return Buffer.concat([PNG, Buffer.alloc(bytes - PNG.length)]);
}

export function usuarioValido(cambios: Record<string, string> = {}) {
  return {
    nombre: 'Laura',
    apellido: 'Carelli',
    correo: 'laura@correo.com',
    nombreUsuario: 'laura_c',
    clave: 'Clave1234',
    fechaNacimiento: '1990-05-20',
    descripcion: 'Estudiante de programación',
    ...cambios,
  };
}

export function registrar(
  app: INestApplication,
  datos: Record<string, string> = usuarioValido(),
  archivo?: { contenido: Buffer; nombre: string; tipo: string },
) {
  const pedido = request(app.getHttpServer()).post('/auth/registro');
  for (const [campo, valor] of Object.entries(datos)) {
    pedido.field(campo, valor);
  }
  if (archivo) {
    pedido.attach('imagen', archivo.contenido, {
      filename: archivo.nombre,
      contentType: archivo.tipo,
    });
  }
  return pedido;
}

export async function registrarYObtenerSesion(
  app: INestApplication,
  cambios: Record<string, string> = {},
) {
  const respuesta = await registrar(app, usuarioValido(cambios)).expect(201);
  return respuesta.body as {
    token: string;
    usuario: { _id: string; nombreUsuario: string };
  };
}
