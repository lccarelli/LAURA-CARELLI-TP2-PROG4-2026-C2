import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { usuarioDePrueba } from '../../testing/usuario';
import { Auth } from '../servicios/auth/auth';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  const ejecutar = () => TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
  const destino = () => TestBed.inject(Router).serializeUrl(ejecutar() as never);

  const ingresarComo = (perfil: 'usuario' | 'administrador') => {
    const auth = TestBed.inject(Auth);
    auth.token.set('un-token');
    auth.usuario.set({ ...usuarioDePrueba, perfil });
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('[O] un administrador pasa', () => {
    ingresarComo('administrador');

    expect(ejecutar()).toBe(true);
  });

  it('[E] una persona común vuelve a las publicaciones', () => {
    ingresarComo('usuario');

    expect(destino()).toBe('/publicaciones');
  });

  it('[Z] sin sesión lleva a /login', () => {
    expect(destino()).toBe('/login');
  });

  it('[E] con token pero sin datos del usuario no deja pasar', () => {
    TestBed.inject(Auth).token.set('un-token');

    expect(destino()).toBe('/publicaciones');
  });
});
