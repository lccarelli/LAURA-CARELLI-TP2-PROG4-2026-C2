import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comentario } from '../publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../publicaciones/schemas/publicacion.schema.js';
import {
  DESFASE_BUENOS_AIRES,
  diasDelRango,
  limitesDelRango,
} from './rango.js';

export type PublicacionesDeUsuario = {
  usuario: string;
  nombreUsuario: string;
  cantidad: number;
};

export type ComentariosDelDia = {
  fecha: string;
  cantidad: number;
};

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Comentario.name)
    private readonly comentarioModel: Model<Comentario>,
  ) {}

  async comentariosPorDia(
    desde: string,
    hasta: string,
  ): Promise<ComentariosDelDia[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.comentarioModel.aggregate<{
      _id: string;
      cantidad: number;
    }>([
      { $match: { fecha: { $gte: inicio, $lt: fin } } },
      {
        $lookup: {
          from: 'publicaciones',
          localField: 'publicacion',
          foreignField: '_id',
          as: 'origen',
        },
      },
      { $match: { 'origen.activa': true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$fecha',
              timezone: DESFASE_BUENOS_AIRES,
            },
          },
          cantidad: { $sum: 1 },
        },
      },
    ]);
    const porDia = new Map(filas.map((fila) => [fila._id, fila.cantidad]));
    return diasDelRango(desde, hasta).map((fecha) => ({
      fecha,
      cantidad: porDia.get(fecha) ?? 0,
    }));
  }

  async publicacionesPorUsuario(
    desde: string,
    hasta: string,
  ): Promise<PublicacionesDeUsuario[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.publicacionModel.aggregate<{
      usuario: { toString(): string };
      nombreUsuario: string;
      cantidad: number;
    }>([
      { $match: { activa: true, fecha: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$usuario', cantidad: { $sum: 1 } } },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'autor',
        },
      },
      { $unwind: '$autor' },
      {
        $project: {
          _id: 0,
          usuario: '$_id',
          nombreUsuario: '$autor.nombreUsuario',
          cantidad: 1,
        },
      },
      { $sort: { cantidad: -1, nombreUsuario: 1 } },
    ]);
    return filas.map((fila) => ({ ...fila, usuario: fila.usuario.toString() }));
  }
}
