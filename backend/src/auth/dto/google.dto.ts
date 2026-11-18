import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  credencial: string;
}
