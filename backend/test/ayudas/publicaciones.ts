import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publicacion } from '../../src/publicaciones/schemas/publicacion.schema.js';

export async function sembrarPublicaciones(
  app: INestApplication,
  usuarioId: string,
  cantidad: number,
  mismaFecha = false,
) {
  const modelo: Model<Publicacion> = app.get(getModelToken(Publicacion.name));
  const inicio = Date.now() - cantidad * 1000;
  const creadas = [];
  for (let numero = 1; numero <= cantidad; numero++) {
    creadas.push(
      await modelo.create({
        usuario: usuarioId,
        tipo: 'experiencia',
        titulo: `Título ${numero}`,
        mensaje: `Mensaje ${numero}`,
        fecha: new Date(mismaFecha ? inicio : inicio + numero * 1000),
      }),
    );
  }
  return creadas;
}
