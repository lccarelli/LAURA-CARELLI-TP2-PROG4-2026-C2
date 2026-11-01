import { registerAs } from '@nestjs/config';
import { variableRequerida } from '../common/variable-requerida.js';

export const authConfig = registerAs('auth', () => ({
  secretoJwt: variableRequerida('JWT_SECRET'),
  expiraJwt: '15m' as const,
  rondasBcrypt: 10,
  correoAdmin: process.env.ADMIN_EMAIL?.toLowerCase(),
}));
