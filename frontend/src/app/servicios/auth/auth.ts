import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion } from '../../interfaces/sesion';
import { Usuario } from '../../interfaces/usuario';

@Service()
export class Auth {
  private http = inject(HttpClient);

  private sinAlmacenamiento = false;

  readonly token = signal<string | null>(this.leer('token'));
  readonly usuario = signal<Usuario | null>(this.leerUsuario());
  readonly motivoDeSalida = signal<string | null>(null);
  readonly volverA = signal<string | null>(null);
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

  sincronizar() {
    if (this.sinAlmacenamiento) {
      return;
    }

    const guardado = this.leer('token');
    if (this.sinAlmacenamiento || guardado === this.token()) {
      return;
    }

    this.token.set(guardado);
    this.usuario.set(guardado ? this.leerUsuario() : null);
  }

  salir(motivo: string | null = null) {
    this.volverA.set(motivo ? this.rutaActual() : null);
    this.borrar('token');
    this.borrar('usuario');
    this.token.set(null);
    this.usuario.set(null);
    this.motivoDeSalida.set(motivo);
  }

  private rutaActual() {
    const { pathname, search } = globalThis.location;
    return pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/registro')
      ? null
      : pathname + search;
  }

  private guardarSesion(sesion: Sesion) {
    this.motivoDeSalida.set(null);
    this.guardarUsuario(sesion.usuario);
    this.guardarToken(sesion.token);
  }

  private guardarUsuario(usuario: Usuario) {
    this.escribir('usuario', JSON.stringify(usuario));
    this.usuario.set(usuario);
  }

  private guardarToken(token: string) {
    this.escribir('token', token);
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
      return JSON.parse(this.leer('usuario') ?? 'null');
    } catch {
      return null;
    }
  }

  private leer(clave: string): string | null {
    try {
      return localStorage.getItem(clave);
    } catch {
      this.sinAlmacenamiento = true;
      return null;
    }
  }

  private escribir(clave: string, valor: string) {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      this.sinAlmacenamiento = true;
    }
  }

  private borrar(clave: string) {
    try {
      localStorage.removeItem(clave);
    } catch {
      this.sinAlmacenamiento = true;
    }
  }
}
