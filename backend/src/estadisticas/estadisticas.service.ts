import { Injectable } from '@nestjs/common';
import { TIPOS_PUBLICACION } from '../publicaciones/dto/crear-publicacion.dto.js';
import {
  EstadisticasRepositorio,
  TotalesDeUnLapso,
} from './estadisticas.repositorio.js';
import { diasDelRango, limitesDelRango, rangoAnterior } from './rango.js';

export type PublicacionesDeUsuario = {
  usuario: string;
  nombreUsuario: string;
  cantidad: number;
};

export type PublicacionesDeTipo = {
  tipo: string;
  cantidad: number;
};

export type ComentariosDelDia = {
  fecha: string;
  cantidad: number;
};

export type ComentariosDePublicacion = {
  publicacion: string;
  titulo: string;
  cantidad: number;
};

export type TotalesDelRango = TotalesDeUnLapso & {
  desde: string;
  hasta: string;
};

export type ResumenDelRango = {
  actual: TotalesDelRango;
  anterior: TotalesDelRango;
};

export const PUBLICACIONES_EN_EL_RANKING = 10;

@Injectable()
export class EstadisticasService {
  constructor(private readonly estadisticas: EstadisticasRepositorio) {}

  async resumen(desde: string, hasta: string): Promise<ResumenDelRango> {
    const actual = limitesDelRango(desde, hasta);
    const previo = rangoAnterior(desde, hasta);
    const anterior = limitesDelRango(previo.desde, previo.hasta);
    const [totalesActual, totalesAnterior] = await Promise.all([
      this.estadisticas.totales(actual.inicio, actual.fin),
      this.estadisticas.totales(anterior.inicio, anterior.fin),
    ]);
    return {
      actual: { desde, hasta, ...totalesActual },
      anterior: { ...previo, ...totalesAnterior },
    };
  }

  async publicacionesPorUsuario(
    desde: string,
    hasta: string,
  ): Promise<PublicacionesDeUsuario[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.estadisticas.publicacionesPorUsuario(inicio, fin);
    return filas.map((fila) => ({ ...fila, usuario: fila.usuario.toString() }));
  }

  async publicacionesPorTipo(
    desde: string,
    hasta: string,
  ): Promise<PublicacionesDeTipo[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.estadisticas.publicacionesPorTipo(inicio, fin);
    const porTipo = new Map(filas.map((fila) => [fila.tipo, fila.cantidad]));
    return TIPOS_PUBLICACION.map((tipo) => ({
      tipo,
      cantidad: porTipo.get(tipo) ?? 0,
    }));
  }

  async comentariosPorPublicacion(
    desde: string,
    hasta: string,
  ): Promise<ComentariosDePublicacion[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.estadisticas.comentariosPorPublicacion(
      inicio,
      fin,
      PUBLICACIONES_EN_EL_RANKING,
    );
    return filas.map((fila) => ({
      ...fila,
      publicacion: fila.publicacion.toString(),
    }));
  }

  async comentariosPorDia(
    desde: string,
    hasta: string,
  ): Promise<ComentariosDelDia[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.estadisticas.comentariosPorDia(inicio, fin);
    const porDia = new Map(filas.map((fila) => [fila.fecha, fila.cantidad]));
    return diasDelRango(desde, hasta).map((fecha) => ({
      fecha,
      cantidad: porDia.get(fecha) ?? 0,
    }));
  }
}
