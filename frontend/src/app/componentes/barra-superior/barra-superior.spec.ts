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
          { path: 'perfil', children: [] },
          { path: 'perfil/publicaciones', children: [] },
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

  it('[S] buscar lleva al listado con la búsqueda en la dirección', async () => {
    await iniciarSesion();
    await router.navigateByUrl('/perfil');

    buscarEscribiendo('tarta');
    await actualizar();

    expect(router.url).toBe('/publicaciones?q=tarta');
  });

  it('[S] en Mis publicaciones la búsqueda se queda ahí y no vuelve al listado general', async () => {
    await iniciarSesion();
    await router.navigateByUrl('/perfil/publicaciones');

    buscarEscribiendo('tarta');
    await actualizar();

    expect(router.url).toBe('/perfil/publicaciones?q=tarta');
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
  ])('[I] en %s el campo dice «%s»', async (ruta, texto) => {
    await iniciarSesion();

    await router.navigateByUrl(ruta);
    await actualizar();

    expect(campo().getAttribute('placeholder')).toBe(texto);
    expect(campo().getAttribute('aria-label')).toBe(texto);
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
});
