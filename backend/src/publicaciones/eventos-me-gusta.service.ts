import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContextLogger,
  EVENTOS_DE_LOG,
  LoggerFactory,
} from '../logs/logs.factory.js';
import {
  EventoMeGusta,
  TIPOS_EVENTO_ME_GUSTA,
} from './schemas/evento-me-gusta.schema.js';

export type DatosEventoMeGusta = {
  tipo: (typeof TIPOS_EVENTO_ME_GUSTA)[number];
  usuario: { id: string; nombreUsuario: string };
  publicacion: { id: string; titulo: string };
  autor: { id: string; nombreUsuario: string };
  cantidadMeGusta: number;
};

@Injectable()
export class EventosMeGustaService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(EventoMeGusta.name)
    private readonly eventoModel: Model<EventoMeGusta>,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(EventosMeGustaService.name);
  }

  async registrar(datos: DatosEventoMeGusta) {
    try {
      await this.eventoModel.create({
        tipo: datos.tipo,
        usuario: datos.usuario.id,
        nombreUsuario: datos.usuario.nombreUsuario,
        publicacion: datos.publicacion.id,
        tituloPublicacion: datos.publicacion.titulo,
        autor: datos.autor.id,
        nombreAutor: datos.autor.nombreUsuario,
        cantidadMeGusta: datos.cantidadMeGusta,
      });
    } catch (error) {
      this.logger.error(
        EVENTOS_DE_LOG.EVENTO_ME_GUSTA_NO_REGISTRADO,
        'No se pudo guardar el evento de me gusta',
        {
          tipo: datos.tipo,
          id_publicacion: datos.publicacion.id,
          id_usuario: datos.usuario.id,
          motivo: (error as Error).message,
        },
      );
    }
  }
}
