import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { proveerIdiomaDePrueba } from '../testing/idioma';
import { routes } from './app.routes';
import { Auth } from './servicios/auth/auth';

describe('rutas', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('[O] un invitado que entra a la raíz ve el inicio', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.tagName).toBe('APP-INICIO');
  });

  it('[I] con sesión, la raíz lleva a las publicaciones', async () => {
    TestBed.inject(Auth).token.set('abc');

    await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/publicaciones');
  });

  it('[E] una ruta que no existe lleva al inicio', async () => {
    await RouterTestingHarness.create('/no-existe');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
