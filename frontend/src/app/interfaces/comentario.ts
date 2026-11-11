import { Usuario } from './usuario';

export const MAXIMO_COMENTARIO = 500;

export interface Comentario {
  _id: string;
  publicacion: string;
  usuario: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  mensaje: string;
  fecha: string;
  modificado: boolean;
  modificadoEn?: string;
}

export interface PaginaComentarios {
  datos: Comentario[];
  offset: number;
  limit: number;
  hayMas: boolean;
}
