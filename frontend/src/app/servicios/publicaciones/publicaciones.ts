import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Comentario, PaginaComentarios } from '../../interfaces/comentario';
import {
  LetraDelIndice,
  LetrasGuardadas,
  OrdenPublicaciones,
  PaginaPublicaciones,
  Publicacion,
  Tipo,
} from '../../interfaces/publicacion';

@Service()
export class PublicacionesApi {
  private http = inject(HttpClient);

  listar(
    offset: number,
    limit = 10,
    orden: OrdenPublicaciones = 'fecha',
    usuario?: string,
    tipo?: Tipo,
    q?: string,
  ) {
    const params: Record<string, string | number> = { offset, limit, orden };
    if (q) {
      params['q'] = q;
    }
    if (usuario) {
      params['usuario'] = usuario;
    }
    if (tipo) {
      params['tipo'] = tipo;
    }
    return this.http.get<PaginaPublicaciones>(`${environment.API_URL}/publicaciones`, { params });
  }

  listarGuardadas(
    offset: number,
    limit = 10,
    letra?: LetraDelIndice | null,
    tipo?: Tipo,
    q?: string,
  ) {
    const params: Record<string, string | number> = { offset, limit };
    if (letra) {
      params['letra'] = letra;
    }
    if (tipo) {
      params['tipo'] = tipo;
    }
    if (q) {
      params['q'] = q;
    }
    return this.http.get<PaginaPublicaciones>(`${environment.API_URL}/guardadas`, { params });
  }

  letrasGuardadas(q?: string) {
    return this.http.get<LetrasGuardadas>(`${environment.API_URL}/guardadas/letras`, {
      params: q ? { q } : {},
    });
  }

  guardar(id: string) {
    return this.http.post<{ guardada: boolean }>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/guardar`,
      {},
    );
  }

  quitarGuardada(id: string) {
    return this.http.delete<void>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/guardar`,
    );
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

  editarComentario(id: string, comentarioId: string, mensaje: string) {
    return this.http.put<Comentario>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}/comentarios/${encodeURIComponent(comentarioId)}`,
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

  editar(id: string, datos: FormData) {
    return this.http.put<Publicacion>(
      `${environment.API_URL}/publicaciones/${encodeURIComponent(id)}`,
      datos,
    );
  }

  crear(datos: FormData) {
    return this.http.post<Publicacion>(`${environment.API_URL}/publicaciones`, datos);
  }
}
