import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';

export class CrearPublicacionDto {
  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  titulo: string;

  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  mensaje: string;
}
