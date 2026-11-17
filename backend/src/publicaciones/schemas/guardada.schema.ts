import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';
import { Publicacion } from './publicacion.schema.js';

@Schema({ collection: 'guardadas', versionKey: false })
export class Guardada {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  usuario: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Publicacion.name,
    required: true,
  })
  publicacion: Types.ObjectId;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const GuardadaSchema = SchemaFactory.createForClass(Guardada);
GuardadaSchema.index({ usuario: 1, publicacion: 1 }, { unique: true });
GuardadaSchema.index({ publicacion: 1 });
