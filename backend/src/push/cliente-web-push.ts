import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import webpush from 'web-push';
import { pushConfig } from './push.config.js';

export type DestinoPush = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const DURACION_MAXIMA_SEGUNDOS = 60 * 60 * 24;

@Injectable()
export class ClienteWebPush {
  readonly habilitado: boolean;

  constructor(
    @Inject(pushConfig.KEY)
    private readonly config: ConfigType<typeof pushConfig>,
  ) {
    this.habilitado = Boolean(config.clavePublica && config.clavePrivada);
    if (this.habilitado) {
      webpush.setVapidDetails(
        config.contacto,
        config.clavePublica!,
        config.clavePrivada!,
      );
    }
  }

  get clavePublica() {
    return this.config.clavePublica;
  }

  async enviar(destino: DestinoPush, contenido: object) {
    await webpush.sendNotification(destino, JSON.stringify(contenido), {
      TTL: DURACION_MAXIMA_SEGUNDOS,
    });
  }
}
