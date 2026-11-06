import { Transform } from 'class-transformer';

export const TransformarAEntero = () =>
  Transform(({ value }) =>
    typeof value === 'string' && /^\d{1,6}$/.test(value)
      ? Number(value)
      : value,
  );
