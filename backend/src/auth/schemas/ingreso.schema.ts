import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema.js';

@Schema({ collection: 'ingresos', versionKey: false })
export class Ingreso {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Usuario.name,
    required: true,
  })
  usuario: Types.ObjectId;

  @Prop({ default: Date.now })
  fecha: Date;
}

export const IngresoSchema = SchemaFactory.createForClass(Ingreso);
IngresoSchema.index({ fecha: -1 });
IngresoSchema.index({ usuario: 1, fecha: -1 });
