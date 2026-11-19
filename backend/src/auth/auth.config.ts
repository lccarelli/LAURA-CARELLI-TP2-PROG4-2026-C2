import { registerAs } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { variableRequerida } from '../common/variable-requerida.js';

export const ALGORITMO_JWT = 'HS256' as const;

const DURACION_POR_DEFECTO = '15m';
const FORMATO_DE_DURACION = /^[1-9]\d*[smh]$/;

function duracionDelToken() {
  const duracion = process.env.JWT_EXPIRA || DURACION_POR_DEFECTO;
  if (!FORMATO_DE_DURACION.test(duracion)) {
    throw new Error(
      'JWT_EXPIRA debe ser un número seguido de s, m o h (por ejemplo 2m)',
    );
  }
  return duracion as SignOptions['expiresIn'];
}

export const authConfig = registerAs('auth', () => ({
  secretoJwt: variableRequerida('JWT_SECRET'),
  expiraJwt: duracionDelToken(),
  duracionMaximaSesionSegundos: 12 * 60 * 60,
  rondasBcrypt: 10,
  correoAdmin: process.env.ADMIN_EMAIL?.toLowerCase(),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  correoAccesoDocente: process.env.ACCESO_DOCENTE_CORREO?.toLowerCase(),
}));
