import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAXIMO_PUBLICO = 12;
export const COMENTARIOS_PUBLICOS = 3;

export class ListarPublicoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAXIMO_PUBLICO)
  limit: number = 8;
}
