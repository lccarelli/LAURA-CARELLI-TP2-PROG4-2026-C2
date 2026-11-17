import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Usuario } from './usuario.schema.js';

@Schema({ collection: 'visitas', versionKey: false })
export class Visita {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  visitante: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  visitado: Types.ObjectId;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const VisitaSchema = SchemaFactory.createForClass(Visita);
VisitaSchema.index({ visitado: 1, fecha: -1 });
