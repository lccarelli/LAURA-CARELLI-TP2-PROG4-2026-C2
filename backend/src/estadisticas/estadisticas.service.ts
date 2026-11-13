import { Injectable } from '@nestjs/common';
import { EstadisticasRepositorio } from './estadisticas.repositorio.js';
import { diasDelRango, limitesDelRango } from './rango.js';

export type PublicacionesDeUsuario = {
  usuario: string;
  nombreUsuario: string;
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

export const PUBLICACIONES_EN_EL_RANKING = 10;

@Injectable()
export class EstadisticasService {
  constructor(private readonly estadisticas: EstadisticasRepositorio) {}

  async publicacionesPorUsuario(
    desde: string,
    hasta: string,
  ): Promise<PublicacionesDeUsuario[]> {
    const { inicio, fin } = limitesDelRango(desde, hasta);
    const filas = await this.estadisticas.publicacionesPorUsuario(inicio, fin);
    return filas.map((fila) => ({ ...fila, usuario: fila.usuario.toString() }));
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
