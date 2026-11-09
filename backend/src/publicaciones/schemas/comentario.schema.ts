import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';

@Schema({ collection: 'comentarios', versionKey: false })
export class Comentario {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Publicacion.name,
    required: true,
  })
  publicacion: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  mensaje: string;

  @Prop({ default: Date.now })
  fecha: Date;

  @Prop({ default: false })
  modificado: boolean;

  @Prop()
  modificadoEn?: Date;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);
ComentarioSchema.index({ publicacion: 1, fecha: -1, _id: -1 });
