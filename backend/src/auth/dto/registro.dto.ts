import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SacarEspacios } from '../../common/sacar-espacios.decorator.js';

export class RegistroDto {
  @SacarEspacios()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre: string;

  @SacarEspacios()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  apellido: string;

  @SacarEspacios()
  @IsEmail()
  @MaxLength(100)
  correo: string;

  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message:
      'nombreUsuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo',
  })
  nombreUsuario: string;

  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,12}$/, {
    message:
      'clave debe tener entre 8 y 12 caracteres, una mayúscula y un número',
  })
  clave: string;

  @IsDateString({ strict: true })
  fechaNacimiento: string;

  @SacarEspacios()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;
}
