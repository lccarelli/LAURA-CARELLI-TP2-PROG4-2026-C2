import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Destino } from '../destinos.js';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';

@Schema({ collection: 'imagenes', versionKey: false })
export class Imagen {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  publicId: string;

  @Prop({ type: String, required: true, enum: Object.values(Destino) })
  destino: Destino;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  tamano: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  usuario: Types.ObjectId;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const ImagenSchema = SchemaFactory.createForClass(Imagen);
ImagenSchema.index({ usuario: 1, fecha: -1, _id: -1 });
