import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SIN_INDICADOR_DE_CARGA } from '../carga/carga';
import { PaginaUsuarios, PerfilPublico, Usuario } from '../../interfaces/usuario';

@Service()
export class UsuariosApi {
  private http = inject(HttpClient);

  listar(offset: number, limit = 10) {
    return this.http.get<PaginaUsuarios>(`${environment.API_URL}/usuarios`, {
      params: { offset, limit },
    });
  }

  obtenerPerfil(id: string) {
    return this.http.get<PerfilPublico>(
      `${environment.API_URL}/usuarios/${encodeURIComponent(id)}`,
    );
  }

  registrarVisita(id: string) {
    return this.http.post<{ registrada: boolean }>(
      `${environment.API_URL}/usuarios/${encodeURIComponent(id)}/visitas`,
      {},
      { context: new HttpContext().set(SIN_INDICADOR_DE_CARGA, true) },
    );
  }

  crear(datos: FormData) {
    return this.http.post<Usuario>(`${environment.API_URL}/usuarios`, datos);
  }

  deshabilitar(id: string) {
    return this.http.delete<Usuario>(`${environment.API_URL}/usuarios/${encodeURIComponent(id)}`);
  }

  habilitar(id: string) {
    return this.http.post<Usuario>(
      `${environment.API_URL}/usuarios/${encodeURIComponent(id)}/habilitar`,
      {},
    );
  }
}
