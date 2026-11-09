import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export const TIPOS_EVENTO_ME_GUSTA = ['dado', 'quitado'] as const;

@Schema({ collection: 'eventos_megusta', versionKey: false })
export class EventoMeGusta {
  @Prop({ type: String, required: true, enum: TIPOS_EVENTO_ME_GUSTA })
  tipo: (typeof TIPOS_EVENTO_ME_GUSTA)[number];

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  nombreUsuario: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  publicacion: Types.ObjectId;

  @Prop({ required: true })
  tituloPublicacion: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  autor: Types.ObjectId;

  @Prop({ required: true })
  nombreAutor: string;

  @Prop({ required: true })
  cantidadMeGusta: number;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const EventoMeGustaSchema = SchemaFactory.createForClass(EventoMeGusta);
EventoMeGustaSchema.index({ fecha: -1 });
EventoMeGustaSchema.index({ publicacion: 1, fecha: -1 });
EventoMeGustaSchema.index({ usuario: 1, fecha: -1 });
EventoMeGustaSchema.index({ autor: 1, fecha: -1 });
