import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comentario } from '../../src/publicaciones/schemas/comentario.schema.js';

export async function cargarComentarios(
  app: INestApplication,
  publicacionId: string,
  usuarioId: string,
  cantidad: number,
  mismaFecha = false,
) {
  const modelo: Model<Comentario> = app.get(getModelToken(Comentario.name));
  const inicio = Date.now() - cantidad * 1000;
  const creados = [];
  for (let numero = 1; numero <= cantidad; numero++) {
    creados.push(
      await modelo.create({
        publicacion: publicacionId,
        usuario: usuarioId,
        mensaje: `Comentario ${numero}`,
        fecha: new Date(mismaFecha ? inicio : inicio + numero * 1000),
      }),
    );
  }
  return creados;
}
