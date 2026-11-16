import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PaginacionDto } from '../../common/paginacion.dto.js';
import { TIPOS_PUBLICACION } from './crear-publicacion.dto.js';

export const ORDENES_PUBLICACION = ['fecha', 'megusta'] as const;

export class ListarPublicacionesDto extends PaginacionDto {
  @IsOptional()
  @IsIn(ORDENES_PUBLICACION)
  orden: (typeof ORDENES_PUBLICACION)[number] = 'fecha';

  @IsOptional()
  @IsMongoId()
  usuario?: string;

  @IsOptional()
  @IsIn(TIPOS_PUBLICACION)
  tipo?: (typeof TIPOS_PUBLICACION)[number];
}
