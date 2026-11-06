import { Usuario } from './usuario';

export const TIPOS = ['receta', 'tip', 'experiencia', 'completa'] as const;

export type Tipo = (typeof TIPOS)[number];

export const UNIDADES = [
  'g',
  'kg',
  'ml',
  'l',
  'taza',
  'cucharada',
  'cucharadita',
  'unidad',
  'pizca',
  'a_gusto',
] as const;

export type Unidad = (typeof UNIDADES)[number];

export interface Ingrediente {
  nombre: string;
  cantidad?: number;
  unidad: Unidad;
}

export interface Publicacion {
  _id: string;
  usuario: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  tipo: Tipo;
  titulo: string;
  mensaje: string;
  ingredientes?: Ingrediente[];
  pasos?: string[];
  porciones?: number;
  tiempoMinutos?: number;
  costo?: number;
  calorias?: number;
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
