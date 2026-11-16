import { registerAs } from '@nestjs/config';

export const webhookConfig = registerAs('webhook', () => ({
  url: process.env.WEBHOOK_URL || undefined,
  secreto: process.env.WEBHOOK_SECRETO || undefined,
  esperaMaximaMs: Number(process.env.WEBHOOK_ESPERA_MS ?? 3000),
}));
