import { seconds } from '@nestjs/throttler';

const entero = (nombre: string, porDefecto: number) => () =>
  Number(process.env[nombre] || porDefecto);

const segundos = (nombre: string, porDefecto: number) => () =>
  seconds(Number(process.env[nombre] || porDefecto));

const BURST_TTL = segundos('LIMITE_BURST_SEGUNDOS', 1);
const SUSTAINED_TTL = segundos('LIMITE_SUSTAINED_SEGUNDOS', 60);

export const LIMITES_GENERALES = [
  {
    name: 'burst',
    ttl: BURST_TTL,
    limit: entero('LIMITE_BURST_SOLICITUDES', 10),
  },
  {
    name: 'sustained',
    ttl: SUSTAINED_TTL,
    limit: entero('LIMITE_SUSTAINED_SOLICITUDES', 120),
  },
];

export const LIMITES_AUTENTICACION = {
  burst: {
    ttl: BURST_TTL,
    limit: entero('LIMITE_INGRESO_BURST_SOLICITUDES', 3),
  },
  sustained: {
    ttl: SUSTAINED_TTL,
    limit: entero('LIMITE_INGRESO_SUSTAINED_SOLICITUDES', 10),
    blockDuration: segundos('LIMITE_INGRESO_BLOQUEO_SEGUNDOS', 300),
  },
};

export const SIN_LIMITES = { burst: true, sustained: true };
