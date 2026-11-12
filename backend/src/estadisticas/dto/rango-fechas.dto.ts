import { IsDateString, Matches } from 'class-validator';

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class RangoFechasDto {
  @Matches(SOLO_FECHA)
  @IsDateString({ strict: true })
  desde: string;

  @Matches(SOLO_FECHA)
  @IsDateString({ strict: true })
  hasta: string;
}
