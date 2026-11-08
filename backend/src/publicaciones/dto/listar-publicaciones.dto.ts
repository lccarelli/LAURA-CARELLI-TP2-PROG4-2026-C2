import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PaginacionDto } from '../../common/paginacion.dto.js';

export const ORDENES_PUBLICACION = ['fecha', 'megusta'] as const;

export class ListarPublicacionesDto extends PaginacionDto {
  @IsOptional()
  @IsIn(ORDENES_PUBLICACION)
  orden: (typeof ORDENES_PUBLICACION)[number] = 'fecha';

  @IsOptional()
  @IsMongoId()
  usuario?: string;
}
