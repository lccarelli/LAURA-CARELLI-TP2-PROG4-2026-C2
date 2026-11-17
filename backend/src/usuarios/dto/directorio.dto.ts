import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  LARGO_MAXIMO_BUSQUEDA,
  LARGO_MINIMO_BUSQUEDA,
  NormalizarBusqueda,
  PALABRAS_MAXIMAS_BUSQUEDA,
} from '../../common/busqueda.js';

export class DirectorioDto {
  @NormalizarBusqueda()
  @IsString()
  @MinLength(LARGO_MINIMO_BUSQUEDA)
  @MaxLength(LARGO_MAXIMO_BUSQUEDA)
  @Matches(new RegExp(`^\\S+( \\S+){0,${PALABRAS_MAXIMAS_BUSQUEDA - 1}}$`))
  texto: string;
}
