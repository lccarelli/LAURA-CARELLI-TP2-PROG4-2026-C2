import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones } from '../../interfaces/publicacion';
import { provideRouter } from '@angular/router';
import { Auth } from '../../servicios/auth/auth';
import { Publicaciones } from './publicaciones';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ESPERA_EN_VISTA_MS } from '../../directivas/en-vista/en-vista';
import { simularObservador } from '../../../testing/observador';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { usuarioDePrueba } from '../../../testing/usuario';

const URL = `${environment.API_URL}/publicaciones`;

const pagina = (desde: number, cantidad: number, hayMas: boolean): PaginaPublicaciones => ({
  datos: Array.from({ length: cantidad }, (_, i) => publicacionDePrueba(desde + i)),
  offset: desde - 1,
  limit: 10,
  hayMas,
});

describe('Publicaciones', () => {
  let fixture: ComponentFixture<Publicaciones>;
  let http: HttpTestingController;

  const pedir = (offset: number, orden = 'fecha') =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL &&
        solicitud.params.get('offset') === String(offset) &&
        solicitud.params.get('limit') === '10' &&
        solicitud.params.get('orden') === orden,
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
    const solicitud = pedir(0);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('limit')).toBe('10');
    solicitud.flush(pagina(1, 0, false));
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

    const solicitud = pedir(10);
    expect(solicitud.request.params.get('offset')).toBe('10');
    solicitud.flush(pagina(11, 0, false));
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

    it('[I] no hay una barra de "qué querés compartir" arriba del listado: se crea con el botón flotante', () => {
      expect(fixture.nativeElement.querySelector('.compartir-hoy')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('a[href="/publicaciones/nueva"]')).toHaveLength(
        1,
      );
    });

    it('[I] arriba del listado van los controles de orden', () => {
      const titulo = fixture.nativeElement.querySelector('h1') as HTMLElement;
      const orden = fixture.nativeElement.querySelector('.orden') as HTMLElement;

      expect(titulo.nextElementSibling).toBe(orden);
    });

    it('[I] la lista no abre ventanas: cada tarjeta es un enlace a su página', () => {
      const tarjeta = fixture.nativeElement.querySelector('.pin') as HTMLAnchorElement;

      expect(tarjeta.getAttribute('href')).toBe('/publicaciones/id1');
      expect(fixture.nativeElement.querySelector('[role="dialog"], form')).toBeNull();
    });
  });

  describe('eliminar desde la lista', () => {
    const autor = usuarioDePrueba;
    const tarjetas = () => fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion');
    const eliminarLaPrimera = async () => {
      (tarjetas()[0].querySelector('.boton-eliminar') as HTMLButtonElement).click();
      await actualizar();
      (
        tarjetas()[0].querySelector('.pin-confirmar .boton-mini-peligro') as HTMLButtonElement
      ).click();
    };

    it('[O] al eliminar una publicación desaparece de la lista sin recargar', async () => {
      TestBed.inject(Auth).usuario.set(autor);
      pedir(0).flush(pagina(1, 3, false));
      await actualizar();

      await eliminarLaPrimera();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await actualizar();

      expect(tarjetas()).toHaveLength(2);
      expect(texto()).not.toContain('Título 1');
      expect(texto()).toContain('Título 2');
    });

    it('[S] la siguiente página sigue pidiéndose con el offset correcto después de eliminar', async () => {
      TestBed.inject(Auth).usuario.set(autor);
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
      await eliminarLaPrimera();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await actualizar();

      botonVerMas()!.click();

      const siguiente = pedir(9);

      expect(siguiente.request.params.get('offset')).toBe('9');
      siguiente.flush(pagina(11, 1, false));
    });

    it('[E] si el servidor no deja eliminarla, la publicación sigue en la lista', async () => {
      TestBed.inject(Auth).usuario.set(autor);
      pedir(0).flush(pagina(1, 2, false));
      await actualizar();

      await eliminarLaPrimera();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1` })
        .flush({ codigo: 'PUBLICACION_AJENA' }, { status: 403, statusText: 'Forbidden' });
      await actualizar();

      expect(tarjetas()).toHaveLength(2);
      expect(texto()).toContain('Título 1');
    });
  });

  describe('orden', () => {
    const opcion = (nombre: string) =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.orden button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent!.includes(nombre))!;
    const titulos = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.pin-titulo') as NodeListOf<HTMLElement>,
      ).map((titulo) => titulo.textContent!.trim());

    it('[O] ofrece ordenar por más recientes o más me gusta, y por defecto va por fecha', async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();

      expect(
        Array.from(
          fixture.nativeElement.querySelectorAll('.orden button') as NodeListOf<HTMLElement>,
        ).map((boton) => boton.textContent!.trim()),
      ).toEqual(['Más recientes', 'Más me gusta']);
      expect(opcion('Más recientes').getAttribute('aria-pressed')).toBe('true');
      expect(opcion('Más me gusta').getAttribute('aria-pressed')).toBe('false');
    });

    it('[O] elegir más me gusta reinicia la lista y pide desde el principio con ese orden', async () => {
      pedir(0).flush(pagina(1, 3, true));
      await actualizar();

      opcion('Más me gusta').click();
      await actualizar();
      expect(titulos()).toEqual([]);
      const masGustadas = pagina(1, 3, false);
      masGustadas.datos.reverse();
      pedir(0, 'megusta').flush(masGustadas);
      await actualizar();

      expect(titulos()).toEqual(['Título 3', 'Título 2', 'Título 1']);
      expect(opcion('Más me gusta').getAttribute('aria-pressed')).toBe('true');
      expect(opcion('Más recientes').getAttribute('aria-pressed')).toBe('false');
    });

    it('[M] Ver más conserva el orden elegido y sigue desde donde estaba', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
      opcion('Más me gusta').click();
      pedir(0, 'megusta').flush(pagina(1, 10, true));
      await actualizar();

      botonVerMas()!.click();
      pedir(10, 'megusta').flush(pagina(11, 2, false));
      await actualizar();

      expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(12);
    });

    it('[B] volver a tocar el orden que ya está elegido no pide nada', async () => {
      pedir(0).flush(pagina(1, 2, false));
      await actualizar();

      opcion('Más recientes').click();
      await actualizar();

      http.verify();
      expect(titulos()).toHaveLength(2);
    });

    it('[S] si se cambia el orden con un pedido en curso, se cancela y su respuesta no se mezcla', async () => {
      const primero = pedir(0);
      await actualizar();

      opcion('Más me gusta').click();
      await actualizar();
      expect(primero.cancelled).toBe(true);
      pedir(0, 'megusta').flush(pagina(100, 1, false));
      await actualizar();

      expect(titulos()).toEqual(['Título 100']);
    });

    it('[E] si falla una carga y se cambia el orden, se recupera sin dejar el aviso viejo', async () => {
      pedir(0).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();
      expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();

      opcion('Más me gusta').click();
      await actualizar();
      expect(fixture.nativeElement.querySelector('app-aviso')).toBeNull();
      pedir(0, 'megusta').flush(pagina(1, 1, false));
      await actualizar();

      expect(titulos()).toEqual(['Título 1']);
    });

    it('[M] volver a más recientes pide por fecha otra vez', async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();
      opcion('Más me gusta').click();
      pedir(0, 'megusta').flush(pagina(1, 1, false));
      await actualizar();

      opcion('Más recientes').click();
      pedir(0, 'fecha').flush(pagina(1, 1, false));
      await actualizar();

      expect(opcion('Más recientes').getAttribute('aria-pressed')).toBe('true');
    });

    it('[I] al salir de la pantalla cancela el pedido pendiente', async () => {
      const pendiente = pedir(0);
      await actualizar();

      fixture.destroy();

      expect(pendiente.cancelled).toBe(true);
    });
  });

  describe('carga automática al hacer scroll', () => {
    let observador: ReturnType<typeof simularObservador>;
    const pedidosDeLista = () => http.match((solicitud) => solicitud.url === URL);

    const esperar = () => vi.advanceTimersByTime(ESPERA_EN_VISTA_MS);

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      observador = simularObservador();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('[O] al quedarse a la vista el final de la lista pide la página siguiente sin tocar el botón', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();

      observador.aparecer();
      esperar();
      pedir(10).flush(pagina(11, 2, false));
      await actualizar();

      expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(12);
    });

    it('[S] sigue cargando páginas mientras el final siga a la vista', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();

      observador.aparecer();
      esperar();
      pedir(10).flush(pagina(11, 10, true));
      await actualizar();
      observador.aparecer();
      esperar();
      pedir(20).flush(pagina(21, 5, false));
      await actualizar();

      expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(25);
    });

    it('[O] antes de cargar, el botón Ver más se alcanza a ver', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();

      vi.advanceTimersByTime(ESPERA_EN_VISTA_MS - 1);

      expect(botonVerMas()).toBeDefined();
      expect(pedidosDeLista()).toHaveLength(0);
    });

    it('[B] cuando no hay más páginas no queda nada que observar', async () => {
      pedir(0).flush(pagina(1, 10, false));
      await actualizar();

      expect(observador.activos()).toHaveLength(0);
    });

    it('[S] el botón sigue funcionando con un clic', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();

      botonVerMas()!.click();

      expect(pedidosDeLista()).toHaveLength(1);
    });

    it('[E] si la carga falla no insiste sola: espera el clic', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
      observador.aparecer();
      esperar();
      pedir(10).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 500, statusText: 'Error' });
      await actualizar();

      observador.aparecer();
      esperar();

      expect(pedidosDeLista()).toHaveLength(0);
      expect(botonVerMas()).toBeDefined();
    });

    it('[E] después de un error, el clic vuelve a pedir y retoma la carga automática', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
      observador.aparecer();
      esperar();
      pedir(10).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 500, statusText: 'Error' });
      await actualizar();

      botonVerMas()!.click();
      pedir(10).flush(pagina(11, 10, true));
      await actualizar();
      observador.aparecer();
      esperar();

      expect(pedidosDeLista()).toHaveLength(1);
    });
  });
});
