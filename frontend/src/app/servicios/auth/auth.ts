import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion } from '../../interfaces/sesion';
import { Usuario } from '../../interfaces/usuario';

@Service()
export class Auth {
  private http = inject(HttpClient);

  readonly token = signal<string | null>(localStorage.getItem('token'));
  readonly usuario = signal<Usuario | null>(this.leerUsuario());
  readonly motivoDeSalida = signal<string | null>(null);
  readonly vencimiento = computed(() => this.leerVencimiento(this.token()));

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

  salir(motivo: string | null = null) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.token.set(null);
    this.usuario.set(null);
    this.motivoDeSalida.set(motivo);
  }

  private guardarSesion(sesion: Sesion) {
    this.motivoDeSalida.set(null);
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

  private leerVencimiento(token: string | null): number | null {
    try {
      const body = token?.split('.')[1]?.replaceAll('-', '+').replaceAll('_', '/');
      const { exp } = JSON.parse(atob(body ?? ''));
      return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private leerUsuario(): Usuario | null {
    try {
      return JSON.parse(localStorage.getItem('usuario') ?? 'null');
    } catch {
      return null;
    }
  }
}
