import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion } from '../../interfaces/sesion';
import { Usuario } from '../../interfaces/usuario';

@Service()
export class Auth {
  private http = inject(HttpClient);

  readonly token = signal<string | null>(localStorage.getItem('token'));
  readonly usuario = signal<Usuario | null>(this.leerUsuario());

  registro(datos: FormData) {
    return this.http
      .post<Sesion>(`${environment.API_URL}/auth/registro`, datos)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  ingresar(identificador: string, clave: string) {
    return this.http
      .post<Sesion>(`${environment.API_URL}/auth/ingresar`, { identificador, clave })
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  refrescar() {
    return this.http
      .post<{ token: string }>(`${environment.API_URL}/auth/refrescar`, {})
      .pipe(tap(({ token }) => this.guardarToken(token)));
  }

  salir() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.token.set(null);
    this.usuario.set(null);
  }

  private guardarSesion(sesion: Sesion) {
    localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
    this.usuario.set(sesion.usuario);
    this.guardarToken(sesion.token);
  }

  private guardarToken(token: string) {
    localStorage.setItem('token', token);
    this.token.set(token);
  }

  private leerUsuario(): Usuario | null {
    try {
      return JSON.parse(localStorage.getItem('usuario') ?? 'null');
    } catch {
      return null;
    }
  }
}
