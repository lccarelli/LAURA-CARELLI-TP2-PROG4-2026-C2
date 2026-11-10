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

  autorizar() {
    return this.http
      .post<{ usuario: Usuario }>(`${environment.API_URL}/auth/autorizar`, {})
      .pipe(tap(({ usuario }) => this.guardarUsuario(usuario)));
  }

  despertarServidor() {
    return this.http.get(`${environment.API_URL}/health`);
  }

  salir() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.token.set(null);
    this.usuario.set(null);
  }

  private guardarSesion(sesion: Sesion) {
    this.guardarUsuario(sesion.usuario);
    this.guardarToken(sesion.token);
  }

  private guardarUsuario(usuario: Usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    this.usuario.set(usuario);
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
