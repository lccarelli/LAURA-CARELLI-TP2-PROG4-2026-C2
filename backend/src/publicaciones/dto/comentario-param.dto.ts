import { IsMongoId } from 'class-validator';

export class ComentarioParamDto {
  @IsMongoId()
  publicacionId: string;

  @IsMongoId()
  comentarioId: string;
}
