import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';

@Service()
export class PublicacionesApi {
  private http = inject(HttpClient);

  listar(offset: number, limit = 10) {
    return this.http.get<PaginaPublicaciones>(`${environment.API_URL}/publicaciones`, {
      params: { offset, limit },
    });
  }

  crear(datos: FormData) {
    return this.http.post<Publicacion>(`${environment.API_URL}/publicaciones`, datos);
  }
}
