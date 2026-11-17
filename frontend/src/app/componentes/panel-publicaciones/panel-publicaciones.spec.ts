import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { Publicacion } from '../../interfaces/publicacion';
import { PanelPublicaciones } from './panel-publicaciones';

const RUTA = `${environment.API_URL}/publico/publicaciones`;

const conImagen = (numero: number) =>
  publicacionDePrueba(numero, { imagen: `https://cdn.test/${numero}.jpg` });

describe('PanelPublicaciones', () => {
  let http: HttpTestingController;

  const simularPantalla = (escritorio: boolean) =>
    vi.stubGlobal('matchMedia', () => ({ matches: escritorio }));

  async function crear() {
    await TestBed.configureTestingModule({
      imports: [PanelPublicaciones],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PanelPublicaciones);
    await fixture.whenStable();
    return fixture;
  }

  const responder = async (fixture: Awaited<ReturnType<typeof crear>>, datos: Publicacion[]) => {
    http.expectOne((s) => s.url === RUTA).flush({ datos, limit: 12 });
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const imagenes = (fixture: Awaited<ReturnType<typeof crear>>) =>
    Array.from(fixture.nativeElement.querySelectorAll('img') as NodeListOf<HTMLImageElement>).map(
      (imagen) => imagen.getAttribute('src'),
    );

  afterEach(() => vi.unstubAllGlobals());

  it('[O] en el celular no pide nada: no hay lugar para las imágenes', async () => {
    simularPantalla(false);

    const fixture = await crear();

    http.expectNone((s) => s.url === RUTA);
    expect(fixture.nativeElement.querySelector('.etiqueta-seccion')).toBeNull();
  });

  it('[O] en pantalla grande pide las publicaciones públicas y muestra sus imágenes con título y autoría', async () => {
    simularPantalla(true);
    const fixture = await crear();

    await responder(fixture, [1, 2, 3, 4, 5, 6, 7].map(conImagen));

    expect(imagenes(fixture)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `https://cdn.test/${n}.jpg`));
    const primera = fixture.nativeElement.querySelector('a.panel-foto') as HTMLAnchorElement;
    expect(primera.getAttribute('href')).toBe('/publico/id1');
    expect(primera.textContent).toContain('Título 1');
    expect(primera.textContent).toContain('@laura_c');
    expect(fixture.nativeElement.textContent).toContain('Lo que se comparte en Banquete');
  });

  it('[I] la primera imagen es más grande que las demás', async () => {
    simularPantalla(true);
    const fixture = await crear();

    await responder(fixture, [1, 2, 3].map(conImagen));

    const fotos = fixture.nativeElement.querySelectorAll('.panel-foto');
    expect(fotos[0].classList).toContain('panel-foto-ancha');
    expect(fotos[1].classList).not.toContain('panel-foto-ancha');
  });

  it('[B] siempre completa los seis lugares: lo que falta se llena con fotos de comidas, sin enlace', async () => {
    simularPantalla(true);
    const fixture = await crear();

    await responder(fixture, [1, 2, 3].map(conImagen));

    const fuentes = imagenes(fixture);
    expect(fuentes).toHaveLength(6);
    expect(fuentes.slice(0, 3)).toEqual([1, 2, 3].map((n) => `https://cdn.test/${n}.jpg`));
    fuentes.slice(3).forEach((src) => expect(src).toMatch(/^comidas\/[a-z-]+\.jpg$/));
    expect(fixture.nativeElement.querySelectorAll('a.panel-foto')).toHaveLength(3);
  });

  it('[S] las publicaciones sin imagen no cuentan', async () => {
    simularPantalla(true);
    const fixture = await crear();

    await responder(fixture, [conImagen(1), publicacionDePrueba(2), conImagen(3), conImagen(4)]);

    expect(imagenes(fixture).slice(0, 3)).toEqual(
      [1, 3, 4].map((n) => `https://cdn.test/${n}.jpg`),
    );
    expect(fixture.nativeElement.querySelectorAll('a.panel-foto')).toHaveLength(3);
  });

  it('[B] con menos de 3 imágenes reales se queda con las fotos de comidas', async () => {
    simularPantalla(true);
    const fixture = await crear();

    await responder(fixture, [conImagen(1), conImagen(2)]);

    expect(imagenes(fixture)).toHaveLength(6);
    imagenes(fixture).forEach((src) => expect(src).toMatch(/^comidas\/[a-z-]+\.jpg$/));
    expect(fixture.nativeElement.querySelector('a.panel-foto')).toBeNull();
    expect(fixture.nativeElement.querySelector('.etiqueta-seccion')).toBeNull();
  });

  it('[E] si falla la carga se ven las fotos de comidas, sin enlaces', async () => {
    simularPantalla(true);
    const fixture = await crear();

    http
      .expectOne((s) => s.url === RUTA)
      .flush({ message: 'x', codigo: 'E' }, { status: 500, statusText: 'x' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(imagenes(fixture)).toHaveLength(6);
    expect(fixture.nativeElement.querySelector('.panel-fotos').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('[I] las imágenes de publicaciones no son decorativas: la tarjeta es un enlace con su título', async () => {
    simularPantalla(true);
    const fixture = await crear();

    await responder(fixture, [1, 2, 3].map(conImagen));

    expect(
      fixture.nativeElement.querySelector('.panel-fotos').getAttribute('aria-hidden'),
    ).toBeNull();
  });
});
