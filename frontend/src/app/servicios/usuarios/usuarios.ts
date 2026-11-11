import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaginaUsuarios, Usuario } from '../../interfaces/usuario';

@Service()
export class UsuariosApi {
  private http = inject(HttpClient);

  listar(offset: number, limit = 10) {
    return this.http.get<PaginaUsuarios>(`${environment.API_URL}/usuarios`, {
      params: { offset, limit },
    });
  }

  crear(datos: FormData) {
    return this.http.post<Usuario>(`${environment.API_URL}/usuarios`, datos);
  }
}
