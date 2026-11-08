import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';
import {
  MAXIMO_FOTOS_PASOS,
  MAXIMO_FOTOS_POR_PASO,
} from '../../imagenes/imagenes.constantes.js';

export const MAXIMO_TEXTO_PASO = 2000;
export const MAXIMO_TITULO_PASO = 80;

export class PasoDto {
  @IsOptional()
  @Transform(({ value }) => {
    const titulo = typeof value === 'string' ? value.trim() : value;
    return titulo === '' ? undefined : titulo;
  })
  @IsString()
  @MaxLength(MAXIMO_TITULO_PASO)
  titulo?: string;

  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAXIMO_TEXTO_PASO)
  texto: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAXIMO_FOTOS_POR_PASO)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(MAXIMO_FOTOS_PASOS - 1, { each: true })
  fotos?: number[];
}
