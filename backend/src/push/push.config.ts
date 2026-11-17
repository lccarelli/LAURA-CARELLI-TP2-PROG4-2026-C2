import { registerAs } from '@nestjs/config';

export const pushConfig = registerAs('push', () => ({
  clavePublica: process.env.VAPID_PUBLIC_KEY || undefined,
  clavePrivada: process.env.VAPID_PRIVATE_KEY || undefined,
  contacto: process.env.VAPID_CONTACTO || 'mailto:soporte@banquete.test',
  urlFrontend: process.env.FRONTEND_URL ?? 'http://localhost:4200',
}));
