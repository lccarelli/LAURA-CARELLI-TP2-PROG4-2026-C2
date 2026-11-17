import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { DatosPersonalesDto } from '../../auth/dto/registro.dto.js';

export class EditarPerfilDto extends DatosPersonalesDto {
  @IsOptional()
  @Transform(
    ({ value }) => ({ true: true, false: false })[value as string] ?? value,
  )
  @IsBoolean()
  quitarImagen?: boolean;
}
