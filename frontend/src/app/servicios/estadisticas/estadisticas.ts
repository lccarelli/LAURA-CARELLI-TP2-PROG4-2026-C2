import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ComentariosDePublicacion,
  ComentariosDelDia,
  PublicacionesDeTipo,
  PublicacionesDeUsuario,
  ResumenDelRango,
} from '../../interfaces/estadisticas';

@Service()
export class EstadisticasApi {
  private http = inject(HttpClient);

  resumen(desde: string, hasta: string) {
    return this.http.get<ResumenDelRango>(`${environment.API_URL}/estadisticas/resumen`, {
      params: { desde, hasta },
    });
  }

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

  publicacionesPorTipo(desde: string, hasta: string) {
    return this.http.get<PublicacionesDeTipo[]>(
      `${environment.API_URL}/estadisticas/publicaciones-por-tipo`,
      { params: { desde, hasta } },
    );
  }
}
