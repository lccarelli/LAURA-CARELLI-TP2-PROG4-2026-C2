import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comentario } from '../publicaciones/schemas/comentario.schema.js';
import { Publicacion } from '../publicaciones/schemas/publicacion.schema.js';
import { DESFASE_BUENOS_AIRES } from './rango.js';

export type FilaDePublicacionesPorUsuario = {
  usuario: Types.ObjectId;
  nombreUsuario: string;
  cantidad: number;
};

export type FilaDePublicacionesPorTipo = {
  tipo: string;
  cantidad: number;
};

export type FilaDeComentariosPorPublicacion = {
  publicacion: Types.ObjectId;
  titulo: string;
  cantidad: number;
};

export type FilaDeComentariosPorDia = {
  fecha: string;
  cantidad: number;
};

export type TotalesDeUnLapso = {
  publicaciones: number;
  comentarios: number;
  personasActivas: number;
};

type Cantidad = { cantidad: number };

const comentariosDePublicacionesActivas = (inicio: Date, fin: Date) => [
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
];

@Injectable()
export class EstadisticasRepositorio {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Comentario.name)
    private readonly comentarioModel: Model<Comentario>,
  ) {}

  publicacionesPorUsuario(inicio: Date, fin: Date) {
    return this.publicacionModel.aggregate<FilaDePublicacionesPorUsuario>([
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
  }

  publicacionesPorTipo(inicio: Date, fin: Date) {
    return this.publicacionModel.aggregate<FilaDePublicacionesPorTipo>([
      { $match: { activa: true, fecha: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
      { $project: { _id: 0, tipo: '$_id', cantidad: 1 } },
    ]);
  }

  comentariosPorPublicacion(inicio: Date, fin: Date, limite: number) {
    return this.comentarioModel.aggregate<FilaDeComentariosPorPublicacion>([
      { $match: { fecha: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$publicacion', cantidad: { $sum: 1 } } },
      {
        $lookup: {
          from: 'publicaciones',
          localField: '_id',
          foreignField: '_id',
          as: 'origen',
        },
      },
      { $unwind: '$origen' },
      { $match: { 'origen.activa': true } },
      {
        $project: {
          _id: 0,
          publicacion: '$_id',
          titulo: '$origen.titulo',
          cantidad: 1,
        },
      },
      { $sort: { cantidad: -1, titulo: 1, publicacion: 1 } },
      { $limit: limite },
    ]);
  }

  comentariosPorDia(inicio: Date, fin: Date) {
    return this.comentarioModel.aggregate<FilaDeComentariosPorDia>([
      ...comentariosDePublicacionesActivas(inicio, fin),
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
      { $project: { _id: 0, fecha: '$_id', cantidad: 1 } },
    ]);
  }

  async totales(inicio: Date, fin: Date): Promise<TotalesDeUnLapso> {
    const [publicaciones, comentarios, personasActivas] = await Promise.all([
      this.publicacionModel.countDocuments({
        activa: true,
        fecha: { $gte: inicio, $lt: fin },
      }),
      this.comentarioModel.aggregate<Cantidad>([
        ...comentariosDePublicacionesActivas(inicio, fin),
        { $count: 'cantidad' },
      ]),
      this.publicacionModel.aggregate<Cantidad>([
        { $match: { activa: true, fecha: { $gte: inicio, $lt: fin } } },
        { $project: { _id: 0, usuario: 1 } },
        {
          $unionWith: {
            coll: 'comentarios',
            pipeline: [
              ...comentariosDePublicacionesActivas(inicio, fin),
              { $project: { _id: 0, usuario: 1 } },
            ],
          },
        },
        { $group: { _id: '$usuario' } },
        { $count: 'cantidad' },
      ]),
    ]);
    return {
      publicaciones,
      comentarios: comentarios[0]?.cantidad ?? 0,
      personasActivas: personasActivas[0]?.cantidad ?? 0,
    };
  }
}
