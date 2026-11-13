export interface PublicacionesDeUsuario {
  usuario: string;
  nombreUsuario: string;
  cantidad: number;
}

export interface ComentariosDelDia {
  fecha: string;
  cantidad: number;
}

export interface ComentariosDePublicacion {
  publicacion: string;
  titulo: string;
  cantidad: number;
}
