import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';

@Schema({ collection: 'publicaciones', versionKey: false })
export class Publicacion {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  mensaje: string;

  @Prop()
  imagen?: string;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
PublicacionSchema.index({ fecha: -1, _id: -1 });
