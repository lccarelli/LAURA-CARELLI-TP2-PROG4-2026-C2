import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';

@Schema({ collection: 'megusta', versionKey: false })
export class MeGusta {
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

export const MeGustaSchema = SchemaFactory.createForClass(MeGusta);
MeGustaSchema.index({ usuario: 1, publicacion: 1 }, { unique: true });
MeGustaSchema.index({ publicacion: 1 });
