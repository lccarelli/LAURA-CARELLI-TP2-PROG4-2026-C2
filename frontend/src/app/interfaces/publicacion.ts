import { Usuario } from './usuario';

export const TIPOS = ['receta', 'tip', 'experiencia', 'completa'] as const;

export type Tipo = (typeof TIPOS)[number];

export interface Publicacion {
  _id: string;
  usuario: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  tipo: Tipo;
  titulo: string;
  mensaje: string;
  ingredientes?: string;
  pasos?: string;
  imagen?: string;
  cantidadMeGusta: number;
  cantidadComentarios: number;
  fecha: string;
}

export interface PaginaPublicaciones {
  datos: Publicacion[];
  offset: number;
  limit: number;
  hayMas: boolean;
}
