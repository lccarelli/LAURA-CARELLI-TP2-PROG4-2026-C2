import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publicacion } from './schemas/publicacion.schema.js';

const CAMPOS_AUTOR = 'nombre apellido nombreUsuario imagenPerfil';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
  ) {}

  async listar(offset: number, limit: number) {
    const publicaciones = await this.publicacionModel
      .find()
      .sort({ fecha: -1, _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .populate('usuario', CAMPOS_AUTOR)
      .lean();

    return {
      datos: publicaciones.slice(0, limit),
      offset,
      limit,
      hayMas: publicaciones.length > limit,
    };
  }
}
