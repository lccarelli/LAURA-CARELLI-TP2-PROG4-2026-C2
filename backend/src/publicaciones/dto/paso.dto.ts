import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  MAXIMO_FOTOS_PASOS,
  MAXIMO_FOTOS_POR_PASO,
} from '../../imagenes/imagenes.constantes.js';

export const MAXIMO_TEXTO_PASO = 2000;
export const MAXIMO_TITULO_PASO = 80;

const sinVacios = ({ value }: { value: unknown }) => {
  const texto = typeof value === 'string' ? value.trim() : value;
  return texto === '' ? undefined : texto;
};

@ValidatorConstraint({ name: 'pasoConContenido' })
class PasoConContenido implements ValidatorConstraintInterface {
  validate(texto: unknown, { object }: ValidationArguments) {
    const { titulo, fotos } = object as PasoDto;
    if (texto === undefined) {
      return Boolean(titulo) || Boolean(fotos?.length);
    }
    return typeof texto === 'string' && texto.length <= MAXIMO_TEXTO_PASO;
  }
}

export class PasoDto {
  @IsOptional()
  @Transform(sinVacios)
  @IsString()
  @MaxLength(MAXIMO_TITULO_PASO)
  titulo?: string;

  @Transform(sinVacios)
  @Validate(PasoConContenido)
  texto?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAXIMO_FOTOS_POR_PASO)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(MAXIMO_FOTOS_PASOS - 1, { each: true })
  fotos?: number[];
}
