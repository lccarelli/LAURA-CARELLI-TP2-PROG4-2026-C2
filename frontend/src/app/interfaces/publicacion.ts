import { Usuario } from './usuario';

export interface Publicacion {
  _id: string;
  usuario: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  titulo: string;
  mensaje: string;
  imagen?: string;
  fecha: string;
}

export interface PaginaPublicaciones {
  datos: Publicacion[];
  offset: number;
  limit: number;
  hayMas: boolean;
}
