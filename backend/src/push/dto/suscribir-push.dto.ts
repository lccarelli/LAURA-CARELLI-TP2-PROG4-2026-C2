import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IDIOMAS_PUSH } from '../schemas/suscripcion-push.schema.js';

export class ClavesPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  auth: string;
}

export class SuscribirPushDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ClavesPushDto)
  keys: ClavesPushDto;

  @IsOptional()
  @IsIn(IDIOMAS_PUSH)
  idioma?: (typeof IDIOMAS_PUSH)[number];
}

export class BajaPushDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint: string;
}
