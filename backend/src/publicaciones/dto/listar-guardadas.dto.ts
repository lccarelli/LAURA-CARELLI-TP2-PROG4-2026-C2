import { IsIn, IsOptional } from 'class-validator';
import { LETRAS_DEL_INDICE } from '../../common/inicial.js';
import type { LetraDelIndice } from '../../common/inicial.js';
import { BusquedaPublicacionesDto } from './busqueda-publicaciones.dto.js';

export class ListarGuardadasDto extends BusquedaPublicacionesDto {
  @IsOptional()
  @IsIn(LETRAS_DEL_INDICE)
  letra?: LetraDelIndice;
}
