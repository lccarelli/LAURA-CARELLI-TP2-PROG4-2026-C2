export const PERFILES = ['usuario', 'administrador'] as const;

export type Perfil = (typeof PERFILES)[number];

export interface Usuario {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenPerfil?: string;
  perfil: Perfil;
  habilitado: boolean;
}

export interface PaginaUsuarios {
  datos: Usuario[];
  offset: number;
  limit: number;
  hayMas: boolean;
}
