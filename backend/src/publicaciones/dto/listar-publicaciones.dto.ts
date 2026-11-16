import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  LARGO_MAXIMO_BUSQUEDA,
  LARGO_MINIMO_BUSQUEDA,
  NormalizarBusqueda,
  PALABRAS_MAXIMAS_BUSQUEDA,
} from '../../common/busqueda.js';
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

  @IsOptional()
  @NormalizarBusqueda()
  @IsString()
  @MinLength(LARGO_MINIMO_BUSQUEDA)
  @MaxLength(LARGO_MAXIMO_BUSQUEDA)
  @Matches(new RegExp(`^\\S+( \\S+){0,${PALABRAS_MAXIMAS_BUSQUEDA - 1}}$`))
  q?: string;
}
