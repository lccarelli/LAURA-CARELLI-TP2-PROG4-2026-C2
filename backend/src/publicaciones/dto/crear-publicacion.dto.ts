import { plainToInstance, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TransformarAEntero } from '../../common/transformar-a-entero.decorator.js';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';
import { IngredienteDto } from './ingrediente.dto.js';

export const TIPOS_PUBLICACION = [
  'receta',
  'tip',
  'experiencia',
  'completa',
] as const;

function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

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
  @TransformarAEntero()
  @IsInt()
  @Min(1)
  @Max(100)
  porciones?: number;

  @IsOptional()
  @TransformarAEntero()
  @IsInt()
  @Min(1)
  @Max(10080)
  tiempoMinutos?: number;

  @IsOptional()
  @TransformarAEntero()
  @IsInt()
  @Min(1)
  @Max(4)
  costo?: number;

  @IsOptional()
  @TransformarAEntero()
  @IsInt()
  @Min(1)
  @Max(10000)
  calorias?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const lista = typeof value === 'string' ? leerJson(value) : value;
    return Array.isArray(lista)
      ? plainToInstance(IngredienteDto, lista)
      : lista;
  })
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  ingredientes?: IngredienteDto[];

  @IsOptional()
  @Transform(({ value }) => {
    const lista = typeof value === 'string' ? leerJson(value) : value;
    return Array.isArray(lista)
      ? lista.map((paso: unknown) =>
          typeof paso === 'string' ? paso.trim() : paso,
        )
      : lista;
  })
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  pasos?: string[];
}
