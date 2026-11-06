import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';

export const UNIDADES_INGREDIENTE = [
  'g',
  'kg',
  'ml',
  'l',
  'taza',
  'cucharada',
  'cucharadita',
  'unidad',
  'pizca',
  'a_gusto',
] as const;

export class IngredienteDto {
  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ValidateIf((ingrediente: IngredienteDto) => ingrediente.unidad !== 'a_gusto')
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(100000)
  cantidad?: number;

  @IsIn(UNIDADES_INGREDIENTE)
  unidad: (typeof UNIDADES_INGREDIENTE)[number];
}
