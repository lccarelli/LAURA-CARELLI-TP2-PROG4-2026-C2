import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export const IDIOMAS_PUSH = ['es', 'en'] as const;

@Schema({ collection: 'suscripciones_push', versionKey: false })
export class SuscripcionPush {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  p256dh: string;

  @Prop({ required: true })
  auth: string;

  @Prop({ type: String, enum: IDIOMAS_PUSH, default: 'es' })
  idioma: (typeof IDIOMAS_PUSH)[number];

  @Prop({ default: Date.now })
  fecha: Date;
}

export const SuscripcionPushSchema =
  SchemaFactory.createForClass(SuscripcionPush);
SuscripcionPushSchema.index({ endpoint: 1 }, { unique: true });
SuscripcionPushSchema.index({ usuario: 1 });
