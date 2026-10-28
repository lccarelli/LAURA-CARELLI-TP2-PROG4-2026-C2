import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invitadoGuard } from './invitado-guard';

describe('invitadoGuard', () => {
  const ejecutar = () =>
    TestBed.runInInjectionContext(() => invitadoGuard({} as never, {} as never));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('[Z] sin sesión deja pasar a registro y login', () => {
    expect(ejecutar()).toBe(true);
  });

  it('[O] con sesión lleva a /publicaciones', () => {
    localStorage.setItem('token', 'un-token');

    const resultado = ejecutar();

    expect(TestBed.inject(Router).serializeUrl(resultado as never)).toBe('/publicaciones');
  });
});
