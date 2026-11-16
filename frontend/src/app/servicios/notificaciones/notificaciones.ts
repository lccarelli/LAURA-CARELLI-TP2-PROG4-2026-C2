import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Notificacion, PaginaNotificaciones } from '../../interfaces/notificacion';

@Service()
export class NotificacionesApi {
  private http = inject(HttpClient);
  private base = `${environment.API_URL}/notificaciones`;

  listar(offset: number, limit = 10) {
    return this.http.get<PaginaNotificaciones>(this.base, { params: { offset, limit } });
  }

  cantidadSinLeer() {
    return this.http.get<{ cantidad: number }>(`${this.base}/sin-leer`);
  }

  marcarLeida(id: string) {
    return this.http.post<Notificacion>(`${this.base}/${encodeURIComponent(id)}/leer`, {});
  }

  marcarTodasLeidas() {
    return this.http.post<{ actualizadas: number }>(`${this.base}/leer-todas`, {});
  }

  eliminar(id: string) {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  eliminarTodas() {
    return this.http.delete<{ eliminadas: number }>(this.base);
  }
}
