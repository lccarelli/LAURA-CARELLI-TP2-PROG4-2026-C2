import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { comoPasos, DatosPublicacionDto } from './crear-publicacion.dto.js';
import { PasoEdicionDto } from './paso.dto.js';

export class EditarPublicacionDto extends DatosPublicacionDto {
  @IsOptional()
  @comoPasos(PasoEdicionDto)
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  pasos?: PasoEdicionDto[];

  @IsOptional()
  @Transform(
    ({ value }) => ({ true: true, false: false })[value as string] ?? value,
  )
  @IsBoolean()
  quitarImagen?: boolean;
}
