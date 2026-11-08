import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { OrdenPublicaciones, PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';

@Service()
export class PublicacionesApi {
  private http = inject(HttpClient);

  listar(offset: number, limit = 10, orden: OrdenPublicaciones = 'fecha') {
    return this.http.get<PaginaPublicaciones>(`${environment.API_URL}/publicaciones`, {
      params: { offset, limit, orden },
    });
  }

  obtener(id: string) {
    return this.http.get<Publicacion>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}`,
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
