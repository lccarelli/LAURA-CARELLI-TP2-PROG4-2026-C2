import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
import { provideRouter } from '@angular/router';
import { Publicaciones } from './publicaciones';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const URL = `${environment.API_URL}/publicaciones`;

const publicacion = (numero: number): Publicacion => ({
  _id: `id${numero}`,
  usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  tipo: 'experiencia',
  cantidadMeGusta: 7,
  cantidadComentarios: 2,
  titulo: `Título ${numero}`,
  mensaje: `Mensaje ${numero}`,
  fecha: '2026-10-22T15:30:00.000Z',
});

const pagina = (desde: number, cantidad: number, hayMas: boolean): PaginaPublicaciones => ({
  datos: Array.from({ length: cantidad }, (_, i) => publicacion(desde + i)),
  offset: desde - 1,
  limit: 10,
  hayMas,
});

describe('Publicaciones', () => {
  let fixture: ComponentFixture<Publicaciones>;
  let http: HttpTestingController;

  const pedir = (offset: number) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL &&
        solicitud.params.get('offset') === String(offset) &&
        solicitud.params.get('limit') === '10',
    );

  const texto = () => fixture.nativeElement.textContent as string;
  const botonVerMas = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.includes('Ver más'));

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Publicaciones],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Publicaciones);
    await fixture.whenStable();
  });

  it('[I] la primera carga pide offset 0 y limit 10', () => {
    pedir(0).flush(pagina(1, 0, false));
  });

  it('[Z] sin publicaciones avisa que todavía no hay y no ofrece ver más', async () => {
    pedir(0).flush(pagina(1, 0, false));
    await actualizar();

    expect(texto()).toContain('Todavía no hay publicaciones');
    expect(botonVerMas()).toBeUndefined();
  });

  it('[E] si la primera carga falla, no dice que no hay recetas', async () => {
    pedir(0).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(texto()).not.toContain('Todavía no hay publicaciones');
  });

  it('[Z] mientras carga muestra Cargando y no el aviso de vacío', async () => {
    await actualizar();

    expect(texto()).toContain('Cargando');
    expect(texto()).not.toContain('Todavía no hay publicaciones');
    pedir(0).flush(pagina(1, 0, false));
  });

  it('[O] con una publicación muestra su título', async () => {
    pedir(0).flush(pagina(1, 1, false));
    await actualizar();

    expect(texto()).toContain('Título 1');
  });

  it('[M] Ver más trae la página siguiente y conserva las anteriores', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush(pagina(11, 2, false));
    await actualizar();

    expect(texto()).toContain('Título 1');
    expect(texto()).toContain('Título 12');
    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(12);
  });

  it('[M] no repite una publicación que ya estaba en la lista', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush(pagina(10, 2, false));
    await actualizar();

    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(11);
  });

  it('[B] cuando no hay más páginas desaparece Ver más', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();
    expect(botonVerMas()).toBeDefined();

    botonVerMas()!.click();
    pedir(10).flush(pagina(11, 3, false));
    await actualizar();

    expect(botonVerMas()).toBeUndefined();
  });

  it('[E] si la API falla muestra el aviso y conserva lo cargado', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(texto()).toContain('Tu sesión no es válida o venció');
    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(10);
  });

  it('[S] mientras espera una página no pide otra', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    fixture.componentInstance.cargarMas();
    fixture.componentInstance.cargarMas();

    pedir(10).flush(pagina(11, 0, false));
  });

  describe('crear una publicación', () => {
    beforeEach(async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();
    });

    it('[I] el botón flotante dice con texto qué hace y lleva a la página de creación', () => {
      const boton = fixture.nativeElement.querySelector('.boton-flotante') as HTMLAnchorElement;

      expect(boton.textContent).toContain('Crear publicación');
      expect(boton.getAttribute('href')).toBe('/publicaciones/nueva');
    });

    it('[I] la barra de arriba también lleva a la página de creación', () => {
      const barra = fixture.nativeElement.querySelector('.compartir-hoy') as HTMLAnchorElement;

      expect(barra.getAttribute('href')).toBe('/publicaciones/nueva');
    });

    it('[I] la lista no abre ventanas: cada tarjeta es un enlace a su página', () => {
      const tarjeta = fixture.nativeElement.querySelector('.pin') as HTMLAnchorElement;

      expect(tarjeta.getAttribute('href')).toBe('/publicaciones/id1');
      expect(fixture.nativeElement.querySelector('[role="dialog"], form')).toBeNull();
    });
  });
});
