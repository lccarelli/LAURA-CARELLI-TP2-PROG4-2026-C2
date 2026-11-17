import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router, provideRouter } from '@angular/router';
import { publicoGuard } from './publico-guard';

describe('publicoGuard', () => {
  const ejecutar = () =>
    TestBed.runInInjectionContext(() =>
      publicoGuard(
        { paramMap: convertToParamMap({ id: 'abc' }) } as ActivatedRouteSnapshot,
        {} as never,
      ),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('[Z] sin sesión deja ver la publicación en sólo lectura', () => {
    expect(ejecutar()).toBe(true);
  });

  it('[O] con sesión lleva al detalle completo de esa publicación', () => {
    localStorage.setItem('token', 'un-token');

    const resultado = ejecutar();

    expect(TestBed.inject(Router).serializeUrl(resultado as never)).toBe('/publicaciones/abc');
  });
});
