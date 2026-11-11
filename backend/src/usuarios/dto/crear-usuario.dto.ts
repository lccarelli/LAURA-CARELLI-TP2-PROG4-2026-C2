import { IsIn } from 'class-validator';
import { RegistroDto } from '../../auth/dto/registro.dto.js';

export const PERFILES = ['usuario', 'administrador'] as const;

export class CrearUsuarioDto extends RegistroDto {
  @IsIn(PERFILES)
  perfil: (typeof PERFILES)[number];
}
