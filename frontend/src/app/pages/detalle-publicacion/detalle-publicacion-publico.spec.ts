import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Comentario } from '../../interfaces/comentario';
import { PublicacionPublica } from '../../interfaces/publicacion';
import { DetallePublicacion } from './detalle-publicacion';
import { comentarioDePrueba } from '../../../testing/comentario';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { proveerRutaConId } from '../../../testing/ruta';

const RUTA = `${environment.API_URL}/publico/publicaciones/id1`;

describe('DetallePublicacion en sólo lectura', () => {
  let fixture: ComponentFixture<DetallePublicacion>;
  let http: HttpTestingController;

  const abrir = async (comentarios: Comentario[] = []) => {
    const datos: PublicacionPublica = { ...publicacionDePrueba(1), comentarios };
    http.expectOne({ method: 'GET', url: RUTA }).flush(datos);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const texto = () => fixture.nativeElement.textContent as string;
  const enlaces = () =>
    Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>).map(
      (a) => a.getAttribute('href'),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePublicacion],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerRutaConId('id1', { soloLectura: true }),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePublicacion);
    await fixture.whenStable();
  });

  it('[O] pide la publicación a la ruta pública y no pide los comentarios por separado', async () => {
    await abrir();

    expect(http.match((s) => s.url.includes('/comentarios'))).toHaveLength(0);
    expect(texto()).toContain('Título 1');
    expect(texto()).toContain('@laura_c');
  });

  it('[I] no ofrece ninguna acción: ni me gusta, ni guardar, ni comentar, ni editar, ni eliminar', async () => {
    await abrir([comentarioDePrueba({ _id: 'c1', mensaje: 'Comentario 1' })]);

    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('app-boton-me-gusta')).toBeNull();
    expect(raiz.querySelector('app-boton-guardar')).toBeNull();
    expect(raiz.querySelector('app-comentarios')).toBeNull();
    expect(raiz.querySelector('app-eliminar-publicacion')).toBeNull();
    expect(raiz.querySelector('textarea, form')).toBeNull();
    expect(enlaces().some((href) => href?.endsWith('/editar'))).toBe(false);
  });

  it('[I] muestra los números de me gusta y de comentarios sin botones', async () => {
    await abrir();

    const etiquetas = Array.from(
      fixture.nativeElement.querySelectorAll('.metricas .metrica') as NodeListOf<HTMLElement>,
    ).map((m) => m.getAttribute('aria-label'));

    expect(etiquetas).toEqual(['7 me gusta', '2 comentarios']);
    expect(fixture.nativeElement.querySelectorAll('.metricas button')).toHaveLength(0);
  });

  it('[O] muestra los comentarios que vienen con la publicación', async () => {
    await abrir([
      comentarioDePrueba({ _id: 'c1', mensaje: 'Comentario 1' }),
      comentarioDePrueba({ _id: 'c2', mensaje: 'Comentario 2' }),
      comentarioDePrueba({ _id: 'c3', mensaje: 'Comentario 3' }),
    ]);

    expect(texto()).toContain('Últimos comentarios');
    expect(fixture.nativeElement.querySelectorAll('app-item-comentario')).toHaveLength(3);
  });

  it('[Z] sin comentarios lo dice', async () => {
    await abrir([]);

    expect(texto()).toContain('Todavía no hay comentarios');
    expect(fixture.nativeElement.querySelector('app-item-comentario')).toBeNull();
  });

  it('[O] invita a ingresar o registrarse para comentar y dar me gusta', async () => {
    await abrir();

    expect(texto()).toContain('Ingresá o registrate para comentar');
    expect(enlaces()).toContain('/registro');
    expect(enlaces()).toContain('/login');
  });

  it('[I] cerrar vuelve a la portada y no al listado con sesión', async () => {
    await abrir();

    const cerrar = fixture.nativeElement.querySelector('a.cerrar-detalle') as HTMLAnchorElement;

    expect(cerrar.getAttribute('href')).toBe('/');
  });

  it('[E] una publicación que no existe muestra el error y vuelve a la portada', async () => {
    http
      .expectOne({ method: 'GET', url: RUTA })
      .flush(
        { message: 'x', codigo: 'PUBLICACION_NO_ENCONTRADA' },
        { status: 404, statusText: 'x' },
      );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(texto()).toContain('No se pudo cargar la publicación');
    expect(enlaces()).toContain('/');
  });
});
