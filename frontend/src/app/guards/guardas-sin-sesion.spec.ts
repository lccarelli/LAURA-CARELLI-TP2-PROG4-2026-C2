import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router, provideRouter } from '@angular/router';
import { invitadoGuard } from './invitado-guard';
import { publicoGuard } from './publico-guard';

const instantanea = { paramMap: convertToParamMap({ id: 'abc' }) } as ActivatedRouteSnapshot;

describe.each([
  ['invitadoGuard', () => invitadoGuard({} as never, {} as never), '/home'],
  ['publicoGuard', () => publicoGuard(instantanea, {} as never), '/publicaciones/abc'],
])('%s', (_nombre, correr, destinoConSesion) => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('[Z] sin sesión deja pasar', () => {
    expect(TestBed.runInInjectionContext(correr)).toBe(true);
  });

  it(`[O] con sesión lleva a ${destinoConSesion}`, () => {
    localStorage.setItem('token', 'un-token');

    const resultado = TestBed.runInInjectionContext(correr);

    expect(TestBed.inject(Router).serializeUrl(resultado as never)).toBe(destinoConSesion);
  });
});
