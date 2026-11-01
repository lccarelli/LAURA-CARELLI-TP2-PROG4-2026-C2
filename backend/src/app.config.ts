import { registerAs } from '@nestjs/config';
import { variableRequerida } from './common/variable-requerida.js';

export const appConfig = registerAs('app', () => ({
  puerto: Number(process.env.PORT ?? 3000),
  urlFrontend: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  uriMongo: variableRequerida('MONGO_URI'),
}));
