import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';
import { ClienteWebPush } from './cliente-web-push.js';
import { SuscribirPushDto } from './dto/suscribir-push.dto.js';
import { pushConfig } from './push.config.js';
import {
  IDIOMAS_PUSH,
  SuscripcionPush,
} from './schemas/suscripcion-push.schema.js';

export type AvisoPush = {
  titulo: string;
  texto: string;
  ruta: string;
};

const CODIGOS_DE_SUSCRIPCION_MUERTA = [404, 410];

@Injectable()
export class PushService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(SuscripcionPush.name)
    private readonly suscripcionModel: Model<SuscripcionPush>,
    private readonly cliente: ClienteWebPush,
    @Inject(pushConfig.KEY)
    private readonly config: ConfigType<typeof pushConfig>,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(PushService.name);
  }

  clavePublica() {
    return {
      clavePublica: this.cliente.habilitado ? this.cliente.clavePublica : null,
    };
  }

  async suscribir(usuarioId: string, dto: SuscribirPushDto) {
    await this.suscripcionModel.updateOne(
      { endpoint: dto.endpoint },
      {
        usuario: usuarioId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        idioma: dto.idioma ?? 'es',
        fecha: new Date(),
      },
      { upsert: true },
    );
  }

  async quitar(usuarioId: string, endpoint: string) {
    await this.suscripcionModel.deleteOne({ endpoint, usuario: usuarioId });
  }

  async avisar(
    usuarioId: string,
    aviso: (idioma: (typeof IDIOMAS_PUSH)[number]) => AvisoPush,
  ) {
    if (!this.cliente.habilitado) {
      return;
    }
    const suscripciones = await this.suscripcionModel
      .find({ usuario: usuarioId })
      .lean();
    await Promise.allSettled(
      suscripciones.map((suscripcion) =>
        this.enviarA(suscripcion, aviso(suscripcion.idioma)),
      ),
    );
  }

  private async enviarA(suscripcion: SuscripcionPush, aviso: AvisoPush) {
    const icono = `${this.config.urlFrontend}/icons/icon-192.png`;
    try {
      await this.cliente.enviar(
        {
          endpoint: suscripcion.endpoint,
          keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
        },
        {
          notification: {
            title: aviso.titulo,
            body: aviso.texto,
            icon: icono,
            badge: icono,
            data: {
              onActionClick: {
                default: {
                  operation: 'navigateLastFocusedOrOpen',
                  url: aviso.ruta,
                },
              },
            },
          },
        },
      );
    } catch (error) {
      const codigo = (error as { statusCode?: number }).statusCode;
      if (codigo && CODIGOS_DE_SUSCRIPCION_MUERTA.includes(codigo)) {
        await this.suscripcionModel.deleteOne({
          endpoint: suscripcion.endpoint,
        });
        return;
      }
      this.logger.error(
        EVENTOS_DE_LOG.PUSH_NO_ENVIADO,
        'No se pudo mandar el aviso push',
        { codigo, motivo: (error as Error).message },
      );
    }
  }
}
