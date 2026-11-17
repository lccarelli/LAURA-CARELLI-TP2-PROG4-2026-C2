import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LETRAS_DEL_INDICE, PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { Guardadas } from './guardadas';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { usuarioDePrueba } from '../../../testing/usuario';

const RAIZ = environment.API_URL;

const pagina = (datos: Publicacion[]): PaginaPublicaciones => ({
  datos,
  offset: 0,
  limit: 10,
  hayMas: false,
});

const CON_PUBLICACIONES: Record<string, number> = { A: 2, B: 1 };

const letrasConAyB = () => ({
  letras: Object.fromEntries(LETRAS_DEL_INDICE.map((l) => [l, CON_PUBLICACIONES[l] ?? 0])),
  total: 3,
});

describe('Guardadas', () => {
  let fixture: ComponentFixture<Guardadas>;
  let http: HttpTestingController;

  const listado = (extra: Record<string, string | null> = {}) =>
    http.expectOne((solicitud) => {
      const esperados: Record<string, string | null> = { offset: '0', limit: '10', ...extra };
      return (
        solicitud.url === `${RAIZ}/publicaciones/guardadas` &&
        Object.entries(esperados).every(([k, v]) => solicitud.params.get(k) === v)
      );
    });
  const letras = (q: string | null = null) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === `${RAIZ}/publicaciones/guardadas/letras` &&
        solicitud.params.get('q') === q,
    );
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const abrir = async (q?: string) => {
    Object.defineProperty(TestBed.inject(ActivatedRoute), 'queryParamMap', {
      value: of(convertToParamMap(q ? { q } : {})),
    });
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
    fixture = TestBed.createComponent(Guardadas);
    await actualizar();
  };
  const solapas = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.solapa-letra') as NodeListOf<HTMLButtonElement>,
    );
  const solapa = (texto: string) => solapas().find((s) => s.textContent?.trim().startsWith(texto))!;
  const texto = () => fixture.nativeElement.textContent as string;
  const titulos = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.pin-titulo') as NodeListOf<HTMLElement>,
    ).map((t) => t.textContent!.trim());

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Guardadas],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('[O] pide la primera página de guardadas y las muestra en el orden recibido', async () => {
    await abrir();
    listado().flush(
      pagina([
        publicacionDePrueba(1, { titulo: 'Ajo' }),
        publicacionDePrueba(2, { titulo: 'Bife' }),
      ]),
    );
    letras().flush(letrasConAyB());
    await actualizar();

    expect(titulos()).toEqual(['Ajo', 'Bife']);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Guardadas');
    expect(texto()).toContain('Ordenadas de la A a la Z');
  });

  it('[I] el índice tiene Todas, de la A a la Z con la Ñ después de la N, y #', async () => {
    await abrir();
    listado().flush(pagina([]));
    letras().flush(letrasConAyB());
    await actualizar();

    const etiquetas = solapas().map((s) => s.textContent!.trim());

    expect(etiquetas).toHaveLength(29);
    expect(etiquetas[0]).toContain('Todas');
    expect(etiquetas.indexOf('Ñ')).toBe(etiquetas.indexOf('N') + 1);
    expect(etiquetas.at(-1)).toBe('#');
  });

  it('[I] Todas muestra el total y las letras sin publicaciones están deshabilitadas', async () => {
    await abrir();
    listado().flush(pagina([]));
    letras().flush(letrasConAyB());
    await actualizar();

    expect(solapa('Todas').textContent).toContain('3');
    expect(solapa('A').disabled).toBe(false);
    expect(solapa('C').disabled).toBe(true);
  });

  it('[S] elegir una letra vuelve a pedir sólo esa letra', async () => {
    await abrir();
    listado().flush(pagina([]));
    letras().flush(letrasConAyB());
    await actualizar();

    solapa('A').click();
    await actualizar();

    listado({ letra: 'A' }).flush(pagina([publicacionDePrueba(1, { titulo: 'Ajo' })]));
    await actualizar();
    expect(titulos()).toEqual(['Ajo']);
    expect(solapa('A').getAttribute('aria-pressed')).toBe('true');
  });

  it('[S] tocar otra vez la letra elegida o Todas vuelve a mostrar todo', async () => {
    await abrir();
    listado().flush(pagina([]));
    letras().flush(letrasConAyB());
    await actualizar();
    solapa('A').click();
    await actualizar();
    listado({ letra: 'A' }).flush(pagina([]));

    solapa('A').click();
    await actualizar();

    listado().flush(pagina([]));
    expect(solapa('Todas').getAttribute('aria-pressed')).toBe('true');
  });

  it('[O] con una búsqueda en la dirección la manda al listado y a las cantidades', async () => {
    await abrir('tarta');

    listado({ q: 'tarta' }).flush(pagina([]));
    letras('tarta').flush({ letras: {}, total: 0 });
    await actualizar();

    expect(texto()).toContain('No encontramos publicaciones para «tarta»');
  });

  it('[Z] sin guardadas lo dice y explica cómo guardar', async () => {
    await abrir();
    listado().flush(pagina([]));
    letras().flush({ letras: {}, total: 0 });
    await actualizar();

    expect(texto()).toContain('Todavía no guardaste ninguna publicación');
  });

  it('[S] al quitar una guardada desde la tarjeta desaparece y se actualizan las cantidades', async () => {
    await abrir();
    listado().flush(pagina([publicacionDePrueba(1, { titulo: 'Ajo', guardada: true })]));
    letras().flush(letrasConAyB());
    await actualizar();

    (fixture.nativeElement.querySelector('app-boton-guardar button') as HTMLButtonElement).click();
    http
      .expectOne({ method: 'POST', url: `${RAIZ}/publicaciones/id1/quitar-guardado` })
      .flush({ guardada: false, cantidadGuardados: 0 });
    await actualizar();

    expect(titulos()).toEqual([]);
    letras().flush({ letras: {}, total: 0 });
  });

  it('[E] si fallan las cantidades el índice igual se ve y la lista no se rompe', async () => {
    await abrir();
    listado().flush(pagina([publicacionDePrueba(1)]));
    letras().flush({ message: 'x', codigo: 'E' }, { status: 500, statusText: 'x' });
    await actualizar();

    expect(solapas()).toHaveLength(29);
    expect(titulos()).toHaveLength(1);
  });
});
