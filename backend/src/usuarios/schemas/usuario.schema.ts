import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'usuarios', versionKey: false })
export class Usuario {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellido: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ required: true, unique: true })
  nombreUsuario: string;

  @Prop({ required: true, select: false })
  clave: string;

  @Prop({ required: true })
  fechaNacimiento: Date;

  @Prop({ required: true })
  descripcion: string;

  @Prop()
  imagenPerfil?: string;

  @Prop({ enum: ['usuario', 'administrador'], default: 'usuario' })
  perfil: string;

  @Prop({ default: true })
  habilitado: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
