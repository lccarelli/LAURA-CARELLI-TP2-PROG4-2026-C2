import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { BusquedaPublicacionesDto } from './busqueda-publicaciones.dto.js';

export const ORDENES_PUBLICACION = [
  'fecha',
  'megusta',
  'guardadas',
  'compartidas',
] as const;

export class ListarPublicacionesDto extends BusquedaPublicacionesDto {
  @IsOptional()
  @IsIn(ORDENES_PUBLICACION)
  orden: (typeof ORDENES_PUBLICACION)[number] = 'fecha';

  @IsOptional()
  @IsMongoId()
  usuario?: string;
}
