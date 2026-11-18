import { registerAs } from '@nestjs/config';
import { variableRequerida } from '../common/variable-requerida.js';

export const ALGORITMO_JWT = 'HS256' as const;

export const authConfig = registerAs('auth', () => ({
  secretoJwt: variableRequerida('JWT_SECRET'),
  expiraJwt: '15m' as const,
  duracionMaximaSesionSegundos: 12 * 60 * 60,
  rondasBcrypt: 10,
  correoAdmin: process.env.ADMIN_EMAIL?.toLowerCase(),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  correoAccesoDocente: process.env.ACCESO_DOCENTE_CORREO?.toLowerCase(),
}));
