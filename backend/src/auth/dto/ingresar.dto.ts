import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IngresarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  identificador: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  clave: string;
}
