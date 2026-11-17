import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Idioma } from '../../servicios/idioma/idioma';
import { Auth } from '../../servicios/auth/auth';
import { BarraSuperior } from './barra-superior';

describe('BarraSuperior', () => {
  let fixture: ComponentFixture<BarraSuperior>;
  let router: Router;

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const campo = () => el('input') as HTMLInputElement;
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const iniciarSesion = async () => {
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
    await actualizar();
  };
  const buscarEscribiendo = (texto: string) => {
    campo().value = texto;
    campo().dispatchEvent(new Event('input'));
    el('form').dispatchEvent(new Event('submit'));
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BarraSuperior],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([
          { path: 'publicaciones', children: [] },
          { path: 'home', children: [] },
          { path: 'perfil', children: [] },
          { path: 'perfil/publicaciones', children: [] },
          { path: 'perfil/guardadas', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(BarraSuperior);
  });

  it('[Z] sin sesión no muestra nada', async () => {
    await actualizar();

    expect(el('.barra-superior')).toBeNull();
  });

  it('[O] con sesión muestra el buscador y, a su derecha, la campanita en la misma fila', async () => {
    await iniciarSesion();

    const hijos = Array.from(el('.barra-superior').children).map((hijo) =>
      hijo.tagName.toLowerCase(),
    );
    expect(hijos).toEqual(['app-buscador', 'app-campanita']);
  });

  it.each([
    ['[S] buscar desde el perfil lleva al listado general', '/perfil', '/publicaciones?q=tarta'],
    [
      '[S] en Mis publicaciones la búsqueda se queda ahí',
      '/perfil/publicaciones',
      '/perfil/publicaciones?q=tarta',
    ],
    ['[S] en Guardadas la búsqueda se queda ahí', '/perfil/guardadas', '/perfil/guardadas?q=tarta'],
  ])('%s', async (_nombre, desde, esperada) => {
    await iniciarSesion();
    await router.navigateByUrl(desde);

    buscarEscribiendo('tarta');
    await actualizar();

    expect(router.url).toBe(esperada);
  });

  it('[S] en Mis publicaciones el campo trae la búsqueda de la dirección y se puede borrar', async () => {
    await iniciarSesion();
    await router.navigateByUrl('/perfil/publicaciones?q=tarta');
    await actualizar();
    expect(campo().value).toBe('tarta');

    (el('.buscador-limpiar') as HTMLButtonElement).click();
    await actualizar();

    expect(router.url).toBe('/perfil/publicaciones');
  });

  it.each([
    ['/publicaciones', 'Buscar publicaciones'],
    ['/perfil', 'Buscar publicaciones'],
    ['/perfil/publicaciones', 'Buscar en mis publicaciones'],
    ['/perfil/guardadas', 'Buscar en mis publicaciones guardadas'],
  ])('[I] en %s el campo dice «%s»', async (ruta, texto) => {
    await iniciarSesion();

    await router.navigateByUrl(ruta);
    await actualizar();

    expect(campo().getAttribute('placeholder')).toBe(texto);
    expect(campo().getAttribute('aria-label')).toBe(texto);
  });

  it('[I] en el inicio no hay buscador y la campanita queda a la derecha', async () => {
    await iniciarSesion();
    await router.navigateByUrl('/home');
    await actualizar();

    const hijos = Array.from(el('.barra-superior').children).map((hijo) =>
      hijo.tagName.toLowerCase(),
    );

    expect(hijos).toEqual(['app-campanita']);
    expect(el('app-campanita').classList).toContain('ml-auto');
  });

  it('[S] en inglés el campo de Mis publicaciones se traduce', async () => {
    TestBed.inject(Idioma).cambiar('en');
    await iniciarSesion();

    await router.navigateByUrl('/perfil/publicaciones');
    await actualizar();

    expect(campo().getAttribute('placeholder')).toBe('Search my posts');
  });

  it('[S] borrar la búsqueda quita q de la dirección', async () => {
    await iniciarSesion();
    await router.navigateByUrl('/publicaciones?q=tarta');
    await actualizar();

    (el('.buscador-limpiar') as HTMLButtonElement).click();
    await actualizar();

    expect(router.url).toBe('/publicaciones');
  });

  it('[O] al abrir una dirección con q, el campo ya trae ese texto', async () => {
    await iniciarSesion();

    await router.navigateByUrl('/publicaciones?q=tarta');
    await actualizar();

    expect(campo().value).toBe('tarta');
  });

  it('[B] en otra pantalla el campo está vacío', async () => {
    await iniciarSesion();

    await router.navigateByUrl('/perfil?q=tarta');
    await actualizar();

    expect(campo().value).toBe('');
  });

  describe('al desplazarse', () => {
    const desplazarA = (posicion: number) => {
      Object.defineProperty(window, 'scrollY', { value: posicion, configurable: true });
      window.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
    };
    const escondida = () => el('.barra-superior').classList.contains('oculta');

    afterEach(() => desplazarA(0));

    it('[Z] al abrir la página se ve', async () => {
      await iniciarSesion();

      expect(escondida()).toBe(false);
    });

    it('[I] al bajar se esconde y al subir vuelve a aparecer', async () => {
      await iniciarSesion();

      desplazarA(300);
      expect(escondida()).toBe(true);

      desplazarA(200);
      expect(escondida()).toBe(false);
    });

    it('[S] al volver a bajar se esconde otra vez', async () => {
      await iniciarSesion();
      desplazarA(300);
      desplazarA(200);

      desplazarA(450);

      expect(escondida()).toBe(true);
    });

    it('[B] arriba de todo siempre se ve', async () => {
      await iniciarSesion();

      desplazarA(40);

      expect(escondida()).toBe(false);
    });
  });
});
