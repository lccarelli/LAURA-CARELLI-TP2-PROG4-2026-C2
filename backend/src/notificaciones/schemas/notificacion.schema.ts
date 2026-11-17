import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export const TIPOS_NOTIFICACION = [
  'comentario',
  'me_gusta',
  'compartida',
] as const;
export const DIAS_DE_VIDA_NOTIFICACION = 90;

@Schema({ collection: 'notificaciones', versionKey: false })
export class Notificacion {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  destinatario: Types.ObjectId;

  @Prop({ type: String, required: true, enum: TIPOS_NOTIFICACION })
  tipo: (typeof TIPOS_NOTIFICACION)[number];

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  publicacion: Types.ObjectId;

  @Prop({ required: true })
  tituloPublicacion: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  actor: Types.ObjectId;

  @Prop({ required: true })
  nombreActor: string;

  @Prop({ default: false })
  leida: boolean;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);
NotificacionSchema.index({ destinatario: 1, fecha: -1, _id: -1 });
NotificacionSchema.index({ destinatario: 1, leida: 1, fecha: -1, _id: -1 });
NotificacionSchema.index(
  { fecha: 1 },
  { expireAfterSeconds: DIAS_DE_VIDA_NOTIFICACION * 24 * 60 * 60 },
);
