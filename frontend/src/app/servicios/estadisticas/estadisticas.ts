import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ComentariosDePublicacion,
  ComentariosDelDia,
  PublicacionesDeUsuario,
} from '../../interfaces/estadisticas';

@Service()
export class EstadisticasApi {
  private http = inject(HttpClient);

  publicacionesPorUsuario(desde: string, hasta: string) {
    return this.http.get<PublicacionesDeUsuario[]>(
      `${environment.API_URL}/estadisticas/publicaciones-por-usuario`,
      { params: { desde, hasta } },
    );
  }

  comentariosPorDia(desde: string, hasta: string) {
    return this.http.get<ComentariosDelDia[]>(
      `${environment.API_URL}/estadisticas/comentarios-por-dia`,
      { params: { desde, hasta } },
    );
  }

  comentariosPorPublicacion(desde: string, hasta: string) {
    return this.http.get<ComentariosDePublicacion[]>(
      `${environment.API_URL}/estadisticas/comentarios-por-publicacion`,
      { params: { desde, hasta } },
    );
  }
}
