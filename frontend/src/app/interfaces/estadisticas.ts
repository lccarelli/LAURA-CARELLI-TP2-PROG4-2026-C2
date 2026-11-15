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

export interface PublicacionesDeTipo {
  tipo: string;
  cantidad: number;
}

export interface TotalesDelRango {
  desde: string;
  hasta: string;
  publicaciones: number;
  comentarios: number;
  personasActivas: number;
}

export interface ResumenDelRango {
  actual: TotalesDelRango;
  anterior: TotalesDelRango;
}
