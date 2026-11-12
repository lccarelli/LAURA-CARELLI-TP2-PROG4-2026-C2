import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publicacion } from '../publicaciones/schemas/publicacion.schema.js';
import { limitesDelRango } from './rango.js';

export type PublicacionesDeUsuario = {
  usuario: string;
  nombreUsuario: string;
  cantidad: number;
};

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
  ) {}

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
