import { IsBoolean } from 'class-validator';

export class ActualizarHabilitadoDto {
  @IsBoolean()
  habilitado: boolean;
}
