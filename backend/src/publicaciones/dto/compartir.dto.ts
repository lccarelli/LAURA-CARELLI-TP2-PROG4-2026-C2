import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsMongoId,
} from 'class-validator';

export const MAXIMO_DESTINATARIOS = 20;

export class CompartirDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAXIMO_DESTINATARIOS)
  @ArrayUnique()
  @IsMongoId({ each: true })
  usuarios: string[];
}
