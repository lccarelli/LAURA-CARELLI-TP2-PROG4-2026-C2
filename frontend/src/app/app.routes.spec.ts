import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { proveerIdiomaDePrueba } from '../testing/idioma';
import { usuarioDePrueba } from '../testing/usuario';
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

  it('[E] sin sesión, la página de nueva publicación lleva al login', async () => {
    await RouterTestingHarness.create('/publicaciones/nueva');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('[E] sin sesión, el detalle de una publicación lleva al login', async () => {
    await RouterTestingHarness.create('/publicaciones/64b64b64b64b64b64b64b64b');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('[O] con sesión, /publicaciones/nueva es la página de nueva publicación', async () => {
    TestBed.inject(Auth).token.set('abc');

    const harness = await RouterTestingHarness.create('/publicaciones/nueva');

    expect(harness.routeNativeElement?.tagName).toBe('APP-NUEVA-PUBLICACION');
  });

  it('[O] con sesión, /publicaciones/:id es la página de detalle', async () => {
    TestBed.inject(Auth).token.set('abc');

    const harness = await RouterTestingHarness.create('/publicaciones/64b64b64b64b64b64b64b64b');

    expect(harness.routeNativeElement?.tagName).toBe('APP-DETALLE-PUBLICACION');
  });

  describe('dashboard/usuarios', () => {
    const ingresarComo = (perfil: 'usuario' | 'administrador') => {
      const auth = TestBed.inject(Auth);
      auth.token.set('abc');
      auth.usuario.set({ ...usuarioDePrueba, perfil });
    };

    it.each(['/dashboard/usuarios', '/dashboard/usuarios/nuevo', '/dashboard/estadisticas'])(
      '[E] sin sesión, %s lleva al login',
      async (ruta) => {
        await RouterTestingHarness.create(ruta);

        expect(TestBed.inject(Router).url).toBe('/login');
      },
    );

    it.each(['/dashboard/usuarios', '/dashboard/usuarios/nuevo', '/dashboard/estadisticas'])(
      '[E] una persona común no entra a %s y vuelve a las publicaciones',
      async (ruta) => {
        ingresarComo('usuario');

        await RouterTestingHarness.create(ruta);

        expect(TestBed.inject(Router).url).toBe('/publicaciones');
      },
    );

    it.each([
      ['/dashboard/usuarios', 'APP-DASHBOARD-USUARIOS'],
      ['/dashboard/usuarios/nuevo', 'APP-NUEVO-USUARIO'],
      ['/dashboard/estadisticas', 'APP-DASHBOARD-ESTADISTICAS'],
    ])('[O] un administrador ve %s', async (ruta, etiqueta) => {
      ingresarComo('administrador');

      const harness = await RouterTestingHarness.create(ruta);

      expect(harness.routeNativeElement?.tagName).toBe(etiqueta);
    });
  });

  it('[E] una ruta que no existe lleva al inicio', async () => {
    await RouterTestingHarness.create('/no-existe');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
