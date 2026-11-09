import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import {
  TIPOS_PUBLICACION,
  TIPOS_RINDE,
} from '../dto/crear-publicacion.dto.js';
import { UNIDADES_INGREDIENTE } from '../dto/ingrediente.dto.js';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';

type Ingrediente = {
  nombre: string;
  cantidad?: number;
  unidad: string;
};

type Paso = {
  titulo?: string;
  texto: string;
  imagenes?: string[];
};

@Schema({ collection: 'publicaciones', versionKey: false })
export class Publicacion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  usuario: Types.ObjectId;

  @Prop({ required: true, enum: TIPOS_PUBLICACION })
  tipo: string;

  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  mensaje: string;

  @Prop({
    type: [
      {
        _id: false,
        nombre: { type: String, required: true },
        cantidad: Number,
        unidad: { type: String, required: true, enum: UNIDADES_INGREDIENTE },
      },
    ],
  })
  ingredientes?: Ingrediente[];

  @Prop({
    type: [
      {
        _id: false,
        titulo: String,
        texto: { type: String, required: true },
        imagenes: { type: [String], default: undefined },
      },
    ],
  })
  pasos?: Paso[];

  @Prop()
  porciones?: number;

  @Prop({ enum: TIPOS_RINDE })
  tipoRinde?: string;

  @Prop()
  tiempoMinutos?: number;

  @Prop()
  costo?: number;

  @Prop()
  calorias?: number;

  @Prop()
  imagen?: string;

  @Prop({ default: true })
  activa: boolean;

  @Prop({ default: 0 })
  cantidadMeGusta: number;

  @Prop({ default: 0 })
  cantidadComentarios: number;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
PublicacionSchema.index({ activa: 1, fecha: -1, _id: -1 });
PublicacionSchema.index({ activa: 1, cantidadMeGusta: -1, fecha: -1, _id: -1 });
PublicacionSchema.index({ usuario: 1, activa: 1, fecha: -1, _id: -1 });
