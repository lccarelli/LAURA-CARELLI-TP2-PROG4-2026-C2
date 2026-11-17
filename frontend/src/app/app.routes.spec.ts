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

  const ID = '64b64b64b64b64b64b64b64b';

  it.each([
    ['[O] un invitado que entra a la raíz ve el inicio', false, '/', '/', 'APP-INICIO'],
    ['[I] con sesión, la raíz lleva al inicio con la bienvenida', true, '/', '/home', null],
    [
      '[E] sin sesión, nueva publicación lleva al login',
      false,
      '/publicaciones/nueva',
      '/login',
      null,
    ],
    ['[E] sin sesión, el detalle lleva al login', false, `/publicaciones/${ID}`, '/login', null],
    [
      '[O] un invitado abre la vista pública de una publicación',
      false,
      `/publico/${ID}`,
      `/publico/${ID}`,
      'APP-DETALLE-PUBLICACION',
    ],
    [
      '[I] con sesión, la vista pública lleva al detalle completo',
      true,
      `/publico/${ID}`,
      `/publicaciones/${ID}`,
      null,
    ],
    [
      '[O] con sesión, /publicaciones/nueva es la página de nueva publicación',
      true,
      '/publicaciones/nueva',
      '/publicaciones/nueva',
      'APP-NUEVA-PUBLICACION',
    ],
    [
      '[O] con sesión, /publicaciones/:id es la página de detalle',
      true,
      `/publicaciones/${ID}`,
      `/publicaciones/${ID}`,
      'APP-DETALLE-PUBLICACION',
    ],
  ])('%s', async (_nombre, conSesion, ruta, esperada, etiqueta) => {
    if (conSesion) {
      TestBed.inject(Auth).token.set('abc');
    }

    const harness = await RouterTestingHarness.create(ruta);

    expect(TestBed.inject(Router).url).toBe(esperada);
    if (etiqueta) {
      expect(harness.routeNativeElement?.tagName).toBe(etiqueta);
    }
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
