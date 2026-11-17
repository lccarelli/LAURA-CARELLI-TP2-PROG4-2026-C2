import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';
import { Publicacion } from './publicacion.schema.js';

@Schema({ collection: 'compartidas', versionKey: false })
export class Compartida {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  de: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  a: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Publicacion.name,
    required: true,
  })
  publicacion: Types.ObjectId;

  @Prop({ default: false })
  vista: boolean;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const CompartidaSchema = SchemaFactory.createForClass(Compartida);
CompartidaSchema.index({ a: 1, fecha: -1 });
CompartidaSchema.index({ a: 1, vista: 1 });
CompartidaSchema.index({ publicacion: 1 });
