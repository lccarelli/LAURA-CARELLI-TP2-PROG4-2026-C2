import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';
import { ListarNotificacionesDto } from './dto/listar-notificaciones.dto.js';
import {
  Notificacion,
  TIPOS_NOTIFICACION,
} from './schemas/notificacion.schema.js';
import { PushService } from '../push/push.service.js';
import { WebhookService } from './webhook.service.js';

export type DatosNotificacion = {
  tipo: (typeof TIPOS_NOTIFICACION)[number];
  destinatarioId: string;
  actor: { id: string; nombreUsuario: string };
  publicacion: { id: string; titulo: string };
};

type NotificacionGuardada = Notificacion & { _id: Types.ObjectId };

const TITULOS = { es: 'Banquete', en: 'Banquete' } as const;

const TEXTOS = {
  comentario: {
    es: (actor: string, titulo: string) => `${actor} comentó en «${titulo}»`,
    en: (actor: string, titulo: string) => `${actor} commented on “${titulo}”`,
  },
  me_gusta: {
    es: (actor: string, titulo: string) => `A ${actor} le gustó «${titulo}»`,
    en: (actor: string, titulo: string) => `${actor} liked “${titulo}”`,
  },
} as const;

const aRespuesta = (notificacion: NotificacionGuardada) => ({
  _id: notificacion._id,
  tipo: notificacion.tipo,
  leida: notificacion.leida,
  fecha: notificacion.fecha,
  publicacion: {
    _id: notificacion.publicacion,
    titulo: notificacion.tituloPublicacion,
  },
  actor: { _id: notificacion.actor, nombreUsuario: notificacion.nombreActor },
});

@Injectable()
export class NotificacionesService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<Notificacion>,
    private readonly webhook: WebhookService,
    private readonly push: PushService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(NotificacionesService.name);
  }

  async notificar(datos: DatosNotificacion) {
    if (datos.destinatarioId === datos.actor.id) {
      return;
    }
    try {
      const fecha = new Date();
      const creada = await this.guardar(datos, fecha);
      if (creada) {
        await this.avisarAlDispositivo(datos);
        await this.webhook.avisar({
          evento: datos.tipo,
          publicacion: datos.publicacion,
          actor: datos.actor,
          destinatario: { id: datos.destinatarioId },
          fecha: fecha.toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        EVENTOS_DE_LOG.NOTIFICACION_NO_REGISTRADA,
        'No se pudo guardar la notificación',
        {
          tipo: datos.tipo,
          id_publicacion: datos.publicacion.id,
          id_usuario: datos.actor.id,
          motivo: (error as Error).message,
        },
      );
    }
  }

  private avisarAlDispositivo(datos: DatosNotificacion) {
    return this.push.avisar(datos.destinatarioId, (idioma) => ({
      titulo: TITULOS[idioma],
      texto: TEXTOS[datos.tipo][idioma](
        datos.actor.nombreUsuario,
        datos.publicacion.titulo,
      ),
      ruta: `/publicaciones/${datos.publicacion.id}${datos.tipo === 'comentario' ? '#comentarios' : ''}`,
    }));
  }

  async listar(
    usuarioId: string,
    { offset, limit, soloNoLeidas }: ListarNotificacionesDto,
  ) {
    const notificaciones = await this.notificacionModel
      .find({ destinatario: usuarioId, ...(soloNoLeidas && { leida: false }) })
      .sort({ fecha: -1, _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .lean<NotificacionGuardada[]>();

    return {
      datos: notificaciones.slice(0, limit).map(aRespuesta),
      offset,
      limit,
      hayMas: notificaciones.length > limit,
    };
  }

  async cantidadSinLeer(usuarioId: string) {
    const cantidad = await this.notificacionModel.countDocuments({
      destinatario: usuarioId,
      leida: false,
    });
    return { cantidad };
  }

  async marcarLeida(id: string, usuarioId: string) {
    const notificacion = await this.notificacionModel
      .findOneAndUpdate(
        { _id: id, destinatario: usuarioId },
        { leida: true },
        { returnDocument: 'after' },
      )
      .lean<NotificacionGuardada>();
    if (!notificacion) {
      throw this.noEncontrada();
    }
    return aRespuesta(notificacion);
  }

  async marcarTodasLeidas(usuarioId: string) {
    const { modifiedCount } = await this.notificacionModel.updateMany(
      { destinatario: usuarioId, leida: false },
      { leida: true },
    );
    return { actualizadas: modifiedCount };
  }

  async eliminar(id: string, usuarioId: string) {
    const { deletedCount } = await this.notificacionModel.deleteOne({
      _id: id,
      destinatario: usuarioId,
    });
    if (!deletedCount) {
      throw this.noEncontrada();
    }
  }

  async eliminarTodas(usuarioId: string) {
    const { deletedCount } = await this.notificacionModel.deleteMany({
      destinatario: usuarioId,
    });
    return { eliminadas: deletedCount };
  }

  private noEncontrada() {
    return new NotFoundException({
      message: 'La notificación no existe',
      codigo: 'NOTIFICACION_NO_ENCONTRADA',
    });
  }

  private async guardar(datos: DatosNotificacion, fecha: Date) {
    const contenido = {
      destinatario: datos.destinatarioId,
      tipo: datos.tipo,
      publicacion: datos.publicacion.id,
      tituloPublicacion: datos.publicacion.titulo,
      actor: datos.actor.id,
      nombreActor: datos.actor.nombreUsuario,
    };
    if (datos.tipo === 'comentario') {
      await this.notificacionModel.create({ ...contenido, fecha });
      return true;
    }
    const { upsertedCount } = await this.notificacionModel.updateOne(
      { ...contenido, leida: false },
      { $setOnInsert: { fecha } },
      { upsert: true },
    );
    return upsertedCount > 0;
  }
}
