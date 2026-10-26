import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';

export const TIPOS_PUBLICACION = [
  'receta',
  'tip',
  'experiencia',
  'completa',
] as const;

export class CrearPublicacionDto {
  @IsIn(TIPOS_PUBLICACION)
  tipo: (typeof TIPOS_PUBLICACION)[number];

  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(55)
  titulo: string;

  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  mensaje: string;

  @IsOptional()
  @SacarEspacios()
  @IsString()
  @MaxLength(1000)
  ingredientes?: string;

  @IsOptional()
  @SacarEspacios()
  @IsString()
  @MaxLength(2000)
  pasos?: string;
}
