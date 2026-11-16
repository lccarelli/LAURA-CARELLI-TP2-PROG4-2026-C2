import { Usuario } from './usuario';

export const TIPOS = ['receta', 'tip', 'experiencia'] as const;

export type Tipo = (typeof TIPOS)[number];

export const TIPOS_RINDE = ['porciones', 'unidades'] as const;

export type TipoRinde = (typeof TIPOS_RINDE)[number];

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

export interface Paso {
  titulo?: string;
  texto?: string;
  imagenes?: string[];
}

export interface Publicacion {
  _id: string;
  usuario: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  tipo: Tipo;
  titulo: string;
  mensaje: string;
  ingredientes?: Ingrediente[];
  pasos?: Paso[];
  porciones?: number;
  tipoRinde?: TipoRinde;
  tiempoMinutos?: number;
  costo?: number;
  calorias?: number;
  imagen?: string;
  cantidadMeGusta: number;
  meGusta?: boolean;
  cantidadComentarios: number;
  fecha: string;
}

export const ORDENES = ['fecha', 'megusta'] as const;

export type OrdenPublicaciones = (typeof ORDENES)[number];

export interface PaginaPublicaciones {
  datos: Publicacion[];
  offset: number;
  limit: number;
  hayMas: boolean;
}
