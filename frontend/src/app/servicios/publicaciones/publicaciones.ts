import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Comentario, PaginaComentarios } from '../../interfaces/comentario';
import { OrdenPublicaciones, PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';

@Service()
export class PublicacionesApi {
  private http = inject(HttpClient);

  listar(offset: number, limit = 10, orden: OrdenPublicaciones = 'fecha', usuario?: string) {
    const params: Record<string, string | number> = { offset, limit, orden };
    if (usuario) {
      params['usuario'] = usuario;
    }
    return this.http.get<PaginaPublicaciones>(`${environment.API_URL}/publicaciones`, { params });
  }

  obtener(id: string) {
    return this.http.get<Publicacion>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}`,
    );
  }

  listarComentarios(id: string, offset: number, limit = 10) {
    return this.http.get<PaginaComentarios>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/comentarios`,
      { params: { offset, limit } },
    );
  }

  comentar(id: string, mensaje: string) {
    return this.http.post<Comentario>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/comentarios`,
      { mensaje },
    );
  }

  darMeGusta(id: string) {
    return this.http.post<{ meGusta: boolean; cantidadMeGusta: number }>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/megusta`,
      {},
    );
  }

  quitarMeGusta(id: string) {
    return this.http.delete<void>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/megusta`,
    );
  }

  eliminar(id: string) {
    return this.http.delete<void>(`${environment.API_URL}/publicaciones/${encodeURIComponent(id)}`);
  }

  crear(datos: FormData) {
    return this.http.post<Publicacion>(`${environment.API_URL}/publicaciones`, datos);
  }
}
