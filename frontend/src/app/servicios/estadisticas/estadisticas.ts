import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PublicacionesDeUsuario } from '../../interfaces/estadisticas';

@Service()
export class EstadisticasApi {
  private http = inject(HttpClient);

  publicacionesPorUsuario(desde: string, hasta: string) {
    return this.http.get<PublicacionesDeUsuario[]>(
      `${environment.API_URL}/estadisticas/publicaciones-por-usuario`,
      { params: { desde, hasta } },
    );
  }
}
