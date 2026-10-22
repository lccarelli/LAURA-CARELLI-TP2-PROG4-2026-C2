import { Transform } from 'class-transformer';

export const SacarEspacios = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
