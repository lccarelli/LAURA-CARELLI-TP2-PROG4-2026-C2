import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginacionDto } from '../../common/paginacion.dto.js';

export class ListarNotificacionesDto extends PaginacionDto {
  @IsOptional()
  @Transform(
    ({ value }) => ({ true: true, false: false })[value as string] ?? value,
  )
  @IsBoolean()
  soloNoLeidas?: boolean;
}
