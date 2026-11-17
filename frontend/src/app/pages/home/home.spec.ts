import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { Home } from './home';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { usuarioDePrueba } from '../../../testing/usuario';

const RAIZ = environment.API_URL;

const pagina = (datos: Publicacion[]): PaginaPublicaciones => ({
  datos,
  offset: 0,
  limit: 12,
  hayMas: false,
});
const conImagen = (numero: number) =>
  publicacionDePrueba(numero, { imagen: `https://cdn.test/${numero}.jpg` });

const TABLEROS = [
  ['Mis publicaciones', '/perfil/publicaciones'],
  ['Guardadas', '/perfil/guardadas'],
  ['Lo más gustado', '/publicaciones?orden=megusta'],
  ['Recetas', '/publicaciones?tipo=receta'],
  ['Tips culinarios', '/publicaciones?tipo=tip'],
  ['Experiencias', '/publicaciones?tipo=experiencia'],
  ['Todo lo que se comparte', '/publicaciones'],
];

const COLLAGES: [string, string, Record<string, string>, string][] = [
  ['las propias', '/publicaciones', { usuario: 'u1' }, '/perfil/publicaciones'],
  ['las guardadas', '/guardadas', {}, '/perfil/guardadas'],
  ['las más gustadas', '/publicaciones', { orden: 'megusta' }, '/publicaciones?orden=megusta'],
  ['las recetas', '/publicaciones', { tipo: 'receta' }, '/publicaciones?tipo=receta'],
  ['los tips', '/publicaciones', { tipo: 'tip' }, '/publicaciones?tipo=tip'],
  [
    'las experiencias',
    '/publicaciones',
    { tipo: 'experiencia' },
    '/publicaciones?tipo=experiencia',
  ],
];

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let http: HttpTestingController;

  const pedidos = (ruta: string, parametros: Record<string, string> = {}) =>
    http.match(
      (solicitud) =>
        solicitud.url === `${RAIZ}${ruta}` &&
        Object.entries(parametros).every(([k, v]) => solicitud.params.get(k) === v),
    );
  const responder = (ruta: string, parametros: Record<string, string>, datos: Publicacion[]) => {
    const [solicitud] = pedidos(ruta, parametros);
    solicitud.flush(pagina(datos));
  };
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const abrir = async (conSesion = true) => {
    TestBed.inject(Auth).usuario.set(conSesion ? usuarioDePrueba : null);
    fixture = TestBed.createComponent(Home);
    await actualizar();
  };
  const tablero = (href: string) =>
    fixture.nativeElement.querySelector(`a.tablero[href="${href}"]`) as HTMLElement;
  const portadasDe = (href: string) =>
    Array.from(
      tablero(href).querySelectorAll('.tablero-portada') as NodeListOf<HTMLImageElement>,
    ).map((imagen) => imagen.getAttribute('src'));
  const vaciar = () => {
    http.match(() => true).forEach((solicitud) => solicitud.flush(pagina([])));
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('[O] saluda por el nombre y resume qué es Banquete en un solo párrafo', async () => {
    await abrir();
    vaciar();
    await actualizar();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Hola, Laura');
    expect(fixture.nativeElement.querySelector('.home-lema').textContent).toContain(
      'compartir recetas',
    );
  });

  it('[I] muestra el resumen de la persona y un enlace a su perfil', async () => {
    await abrir();
    vaciar();
    await actualizar();

    const enlace = fixture.nativeElement.querySelector('a[href="/perfil"]') as HTMLElement;

    expect(enlace.textContent).toContain('Ver mi perfil');
    expect(fixture.nativeElement.textContent).toContain('@laura_c');
  });

  it('[I] ofrece crear una publicación', async () => {
    await abrir();
    vaciar();
    await actualizar();

    const crear = fixture.nativeElement.querySelector('a[href="/publicaciones/nueva"]');

    expect(crear.textContent).toContain('Crear una publicación');
  });

  it('[I] no tiene buscador propio', async () => {
    await abrir();
    vaciar();
    await actualizar();

    expect(fixture.nativeElement.querySelector('[role="search"]')).toBeNull();
  });

  it.each(TABLEROS)('[O] hay un tablero «%s» que lleva a %s', async (titulo, href) => {
    await abrir();
    vaciar();
    await actualizar();

    expect(tablero(href).textContent).toContain(titulo);
  });

  it('[I] separa lo que se comparte en otra pantalla: los tableros de la comunidad abren el listado', async () => {
    await abrir();
    vaciar();
    await actualizar();

    const destinos = TABLEROS.map(([, href]) => href).filter((href) =>
      href.startsWith('/publicaciones'),
    );

    expect(destinos).toHaveLength(5);
    destinos.forEach((href) => expect(tablero(href)).not.toBeNull());
  });

  it.each(COLLAGES)(
    '[O] el collage usa las portadas de %s',
    async (_nombre, ruta, parametros, href) => {
      await abrir();
      responder(ruta, parametros, [conImagen(1), publicacionDePrueba(2), conImagen(3)]);
      vaciar();
      await actualizar();

      expect(portadasDe(href)).toEqual(['https://cdn.test/1.jpg', 'https://cdn.test/3.jpg']);
    },
  );

  it('[B] el collage usa como máximo 3 portadas', async () => {
    await abrir();
    responder('/guardadas', {}, [conImagen(1), conImagen(2), conImagen(3), conImagen(4)]);
    vaciar();
    await actualizar();

    expect(portadasDe('/perfil/guardadas')).toHaveLength(3);
  });

  it('[Z] sin sesión no pide las propias, pero muestra los demás tableros', async () => {
    await abrir(false);

    expect(pedidos('/publicaciones', { usuario: 'u1' })).toHaveLength(0);
    vaciar();
    await actualizar();
    expect(tablero('/publicaciones?tipo=tip')).not.toBeNull();
  });

  it('[E] si fallan las cargas los tableros se ven igual, sin portadas', async () => {
    await abrir();
    http
      .match(() => true)
      .forEach((solicitud) =>
        solicitud.flush({ message: 'x', codigo: 'E' }, { status: 500, statusText: 'x' }),
      );
    await actualizar();

    expect(fixture.nativeElement.querySelectorAll('a.tablero')).toHaveLength(7);
    expect(fixture.nativeElement.querySelectorAll('.tablero-portada')).toHaveLength(0);
  });
});
