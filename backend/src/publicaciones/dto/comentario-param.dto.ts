import { IsMongoId } from 'class-validator';

export class ComentarioParamDto {
  @IsMongoId()
  id: string;

  @IsMongoId()
  comentarioId: string;
}
