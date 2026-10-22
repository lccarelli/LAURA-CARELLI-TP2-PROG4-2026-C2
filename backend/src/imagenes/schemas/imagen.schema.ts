import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'imagenes', versionKey: false })
export class Imagen {
  @Prop({ required: true })
  data: Buffer;

  @Prop({ required: true })
  mimeType: string;
}

export const ImagenSchema = SchemaFactory.createForClass(Imagen);
