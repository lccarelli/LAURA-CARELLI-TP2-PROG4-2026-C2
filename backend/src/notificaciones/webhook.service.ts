import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';
import { webhookConfig } from './webhook.config.js';

export type EventoWebhook = {
  evento: 'comentario' | 'me_gusta';
  publicacion: { id: string; titulo: string };
  actor: { id: string; nombreUsuario: string };
  destinatario: { id: string };
  fecha: string;
};

export const ENCABEZADO_FIRMA = 'X-Banquete-Firma';

@Injectable()
export class WebhookService {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(webhookConfig.KEY)
    private readonly config: ConfigType<typeof webhookConfig>,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(WebhookService.name);
  }

  async avisar(evento: EventoWebhook) {
    const { url, secreto, esperaMaximaMs } = this.config;
    if (!url) {
      return;
    }
    const cuerpo = JSON.stringify(evento);
    const encabezados: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secreto) {
      const firma = createHmac('sha256', secreto).update(cuerpo).digest('hex');
      encabezados[ENCABEZADO_FIRMA] = `sha256=${firma}`;
    }
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: encabezados,
        body: cuerpo,
        signal: AbortSignal.timeout(esperaMaximaMs),
      });
      if (!respuesta.ok) {
        this.registrarFallo(evento, `respuesta ${respuesta.status}`);
      }
    } catch (error) {
      this.registrarFallo(evento, (error as Error).message);
    }
  }

  private registrarFallo(evento: EventoWebhook, motivo: string) {
    this.logger.error(
      EVENTOS_DE_LOG.WEBHOOK_NO_ENVIADO,
      'No se pudo avisar al webhook',
      {
        evento: evento.evento,
        id_publicacion: evento.publicacion.id,
        motivo,
      },
    );
  }
}
