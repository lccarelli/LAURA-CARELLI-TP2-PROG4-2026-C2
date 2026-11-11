import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';

export const MAXIMO_COMENTARIO = 500;

export class CrearComentarioDto {
  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAXIMO_COMENTARIO)
  mensaje: string;
}
