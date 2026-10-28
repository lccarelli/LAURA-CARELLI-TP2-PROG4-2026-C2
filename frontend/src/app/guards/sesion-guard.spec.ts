import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { sesionGuard } from './sesion-guard';

describe('sesionGuard', () => {
  const ejecutar = () => TestBed.runInInjectionContext(() => sesionGuard({} as never, {} as never));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('[Z] sin sesión lleva a /login', () => {
    const resultado = ejecutar();

    expect(TestBed.inject(Router).serializeUrl(resultado as never)).toBe('/login');
  });

  it('[O] con sesión deja pasar', () => {
    localStorage.setItem('token', 'un-token');

    expect(ejecutar()).toBe(true);
  });
});
