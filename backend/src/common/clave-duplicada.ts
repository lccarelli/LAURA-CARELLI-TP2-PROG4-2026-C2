const CODIGO_CLAVE_DUPLICADA = 11000;

export const esClaveDuplicada = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === CODIGO_CLAVE_DUPLICADA;
