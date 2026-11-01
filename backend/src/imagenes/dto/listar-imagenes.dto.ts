import { IsEnum, IsOptional } from 'class-validator';
import { PaginacionDto } from '../../common/paginacion.dto.js';
import { Destino } from '../destinos.js';

export class ListarImagenesDto extends PaginacionDto {
  @IsOptional()
  @IsEnum(Destino)
  destino?: Destino;
}
