import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones } from '../../interfaces/publicacion';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { MuroPublicaciones } from '../../componentes/muro-publicaciones/muro-publicaciones';
import { Publicaciones } from './publicaciones';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { pruebasDeCargaAutomatica } from '../../../testing/carga-automatica';
import { publicacionDePrueba } from '../../../testing/publicacion';

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

  const pedir = (offset: number, orden = 'fecha', tipo: string | null = null) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL &&
        solicitud.params.get('offset') === String(offset) &&
        solicitud.params.get('limit') === '10' &&
        solicitud.params.get('orden') === orden &&
        solicitud.params.get('tipo') === tipo,
    );

  const muro = () =>
    fixture.debugElement.query(By.directive(MuroPublicaciones))
      .componentInstance as MuroPublicaciones;
  const texto = () => fixture.nativeElement.textContent as string;
  const titulos = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.pin-titulo') as NodeListOf<HTMLElement>,
    ).map((titulo) => titulo.textContent!.trim());
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

  it('[Z] mientras carga no muestra el aviso de vacío', async () => {
    await actualizar();

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

    muro().listado.cargarMas();
    muro().listado.cargarMas();

    const solicitud = pedir(10);
    expect(solicitud.request.params.get('offset')).toBe('10');
    solicitud.flush(pagina(11, 0, false));
  });

  it('[I] reparte las tarjetas por filas: la segunda va a la derecha de la primera, no debajo', async () => {
    pedir(0).flush(pagina(1, 6, false));
    muro().columnas.set(2);
    await actualizar();
    const columnas = Array.from(
      fixture.nativeElement.querySelectorAll('.muro-columna') as NodeListOf<HTMLElement>,
    );
    const titulosPorColumna = columnas.map((columna) =>
      Array.from(columna.querySelectorAll('.pin-titulo')).map((t) => t.textContent?.trim()),
    );

    expect(titulosPorColumna).toEqual([
      ['Título 1', 'Título 3', 'Título 5'],
      ['Título 2', 'Título 4', 'Título 6'],
    ]);
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

    it('[I] arriba del listado van el orden y el filtro, en un mismo bloque', () => {
      const controles = fixture.nativeElement.querySelector(
        'app-muro-publicaciones > .controles-listado',
      ) as HTMLElement;

      expect(controles).not.toBeNull();
      expect(controles.querySelector('.orden')).not.toBeNull();
      expect(controles.querySelector('.filtro-tipo')).not.toBeNull();
    });

    it('[I] la lista no abre ventanas: cada tarjeta es un enlace a su página', () => {
      const tarjeta = fixture.nativeElement.querySelector('.pin') as HTMLAnchorElement;

      expect(tarjeta.getAttribute('href')).toBe('/publicaciones/id1');
      expect(
        fixture.nativeElement.querySelector('[role="dialog"], form:not([role="search"])'),
      ).toBeNull();
    });
  });

  describe('eliminar desde la lista', () => {
    it('[I] las tarjetas de la lista no tienen botón de eliminar: la baja se hace desde el detalle', async () => {
      await actualizar();
      pedir(0).flush(pagina(1, 2, false));
      await actualizar();

      expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(2);
      expect(fixture.nativeElement.querySelector('.boton-eliminar')).toBeNull();
    });
  });

  describe('búsqueda desde la dirección', () => {
    it('[O] si la dirección trae q, la primera carga ya pide esa búsqueda', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Publicaciones],
        providers: [
          proveerIdiomaDePrueba(),
          provideRouter([{ path: 'publicaciones', component: Publicaciones }]),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      }).compileComponents();
      const enrutador = TestBed.inject(Router);
      await enrutador.navigateByUrl('/publicaciones?q=tarta');
      const abierto = TestBed.createComponent(Publicaciones);
      await abierto.whenStable();

      const solicitud = TestBed.inject(HttpTestingController).expectOne(
        (s) => s.url === URL && s.params.get('q') === 'tarta' && s.params.get('offset') === '0',
      );
      expect(solicitud.request.method).toBe('GET');
      solicitud.flush(pagina(1, 1, false));
    });

    it('[S] cuando cambia q en la dirección vuelve a pedir desde el principio', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();

      await TestBed.inject(Router).navigate([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { q: 'pizza' },
      });
      await actualizar();

      expect(muro().busqueda()).toBe('pizza');
    });
  });

  describe('filtros desde la dirección', () => {
    const abrirCon = async (consulta: string) => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Publicaciones],
        providers: [
          proveerIdiomaDePrueba(),
          provideRouter([{ path: 'publicaciones', component: Publicaciones }]),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      }).compileComponents();
      await TestBed.inject(Router).navigateByUrl(`/publicaciones${consulta}`);
      const abierto = TestBed.createComponent(Publicaciones);
      await abierto.whenStable();
      const solicitud = TestBed.inject(HttpTestingController).expectOne(
        (s) => s.url === URL && s.params.get('offset') === '0',
      );
      return { solicitud, abierto };
    };

    it.each([
      ['?tipo=receta', 'tipo', 'receta'],
      ['?orden=megusta', 'orden', 'megusta'],
      ['?tipo=tip&orden=megusta', 'tipo', 'tip'],
    ])('[O] con %s la primera carga ya pide %s=%s', async (consulta, parametro, valor) => {
      const { solicitud } = await abrirCon(consulta);

      expect(solicitud.request.params.get(parametro)).toBe(valor);
      solicitud.flush(pagina(1, 1, false));
    });

    it('[E] un tipo o un orden que no existen se ignoran', async () => {
      const { solicitud } = await abrirCon('?tipo=postre&orden=azar');

      expect(solicitud.request.params.has('tipo')).toBe(false);
      expect(solicitud.request.params.get('orden')).toBe('fecha');
      solicitud.flush(pagina(1, 1, false));
    });

    it('[S] los botones de la pantalla muestran el filtro que vino en la dirección', async () => {
      const { solicitud, abierto } = await abrirCon('?tipo=tip&orden=megusta');
      solicitud.flush(pagina(1, 1, false));
      abierto.detectChanges();
      await abierto.whenStable();

      const activos = Array.from(
        abierto.nativeElement.querySelectorAll('.activo') as NodeListOf<HTMLElement>,
      ).map((boton) => boton.textContent?.trim());

      expect(activos).toEqual(['Más me gusta', 'Tips']);
    });
  });

  describe('búsqueda', () => {
    const pedirBusqueda = (q: string, offset = 0) =>
      http.expectOne(
        (solicitud) =>
          solicitud.url === URL &&
          solicitud.params.get('q') === q &&
          solicitud.params.get('offset') === String(offset),
      );

    beforeEach(async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
    });

    it('[O] al buscar pide desde el principio con q y muestra sólo los resultados', async () => {
      muro().buscar('tarta');
      const solicitud = pedirBusqueda('tarta');
      solicitud.flush(pagina(50, 2, false));
      await actualizar();

      expect(solicitud.request.params.get('limit')).toBe('10');
      expect(titulos()).toEqual(['Título 50', 'Título 51']);
    });

    it('[S] conserva el orden y el tipo elegidos', async () => {
      muro().cambiarTipo('tip');
      pedir(0, 'fecha', 'tip').flush(pagina(1, 1, false));
      await actualizar();

      muro().buscar('tarta');
      const solicitud = pedirBusqueda('tarta');

      expect(solicitud.request.params.get('tipo')).toBe('tip');
      expect(solicitud.request.params.get('orden')).toBe('fecha');
      solicitud.flush(pagina(1, 0, false));
    });

    it('[S] ver más sigue pidiendo páginas con la misma búsqueda', async () => {
      muro().buscar('tarta');
      pedirBusqueda('tarta').flush(pagina(50, 10, true));
      await actualizar();

      muro().listado.cargarMas();

      const siguiente = pedirBusqueda('tarta', 10);
      siguiente.flush(pagina(60, 1, false));

      expect(siguiente.request.params.get('q')).toBe('tarta');
    });

    it('[S] la búsqueda anterior que seguía en vuelo se cancela', async () => {
      muro().buscar('tarta');
      const primera = pedirBusqueda('tarta');
      muro().buscar('torta');

      expect(primera.cancelled).toBe(true);
      pedirBusqueda('torta').flush(pagina(1, 0, false));
    });

    it('[O] sin resultados dice qué se buscó', async () => {
      muro().buscar('pizza');
      pedirBusqueda('pizza').flush(pagina(1, 0, false));
      await actualizar();

      expect(texto()).toContain('No encontramos publicaciones para «pizza»');
    });

    it('[S] al borrar la búsqueda vuelve el listado completo', async () => {
      muro().buscar('tarta');
      pedirBusqueda('tarta').flush(pagina(50, 1, false));
      await actualizar();

      muro().buscar('');
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();

      expect(titulos()).toHaveLength(10);
    });

    it('[B] buscar lo mismo dos veces no vuelve a pedir', async () => {
      muro().buscar('tarta');
      pedirBusqueda('tarta').flush(pagina(50, 1, false));
      await actualizar();

      muro().buscar('tarta');

      expect(http.match(URL)).toEqual([]);
    });
  });

  describe('filtro por tipo', () => {
    const filtro = (nombre: string) =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '.filtro-tipo button',
        ) as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent!.trim() === nombre)!;

    it('[O] ofrece Todas, Recetas, Tips y Experiencias, y por defecto no filtra', async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();

      expect(
        Array.from(
          fixture.nativeElement.querySelectorAll('.filtro-tipo button') as NodeListOf<HTMLElement>,
        ).map((boton) => boton.textContent!.trim()),
      ).toEqual(['Todas', 'Recetas', 'Tips', 'Experiencias']);
      expect(filtro('Todas').getAttribute('aria-pressed')).toBe('true');
      expect(filtro('Recetas').getAttribute('aria-pressed')).toBe('false');
    });

    it.each([
      ['Recetas', 'receta'],
      ['Tips', 'tip'],
      ['Experiencias', 'experiencia'],
    ])('[O] elegir %s reinicia la lista y pide sólo ese tipo', async (nombre, tipo) => {
      pedir(0).flush(pagina(1, 3, true));
      await actualizar();

      filtro(nombre).click();
      await actualizar();
      expect(titulos()).toEqual([]);
      pedir(0, 'fecha', tipo).flush(pagina(1, 1, false));
      await actualizar();

      expect(titulos()).toEqual(['Título 1']);
      expect(filtro(nombre).getAttribute('aria-pressed')).toBe('true');
      expect(filtro('Todas').getAttribute('aria-pressed')).toBe('false');
    });

    it('[S] volver a Todas quita el filtro', async () => {
      pedir(0).flush(pagina(1, 3, true));
      await actualizar();
      filtro('Recetas').click();
      await actualizar();
      pedir(0, 'fecha', 'receta').flush(pagina(1, 1, false));
      await actualizar();

      filtro('Todas').click();
      await actualizar();
      pedir(0).flush(pagina(1, 3, false));
      await actualizar();

      expect(titulos()).toHaveLength(3);
    });

    it('[M] se combina con el orden y Ver más conserva los dos', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
      filtro('Tips').click();
      await actualizar();
      pedir(0, 'fecha', 'tip').flush(pagina(1, 10, true));
      await actualizar();

      fixture.nativeElement.querySelectorAll('.orden button')[1].dispatchEvent(new Event('click'));
      await actualizar();
      pedir(0, 'megusta', 'tip').flush(pagina(1, 10, true));
      await actualizar();
      botonVerMas()!.click();
      await actualizar();

      pedir(10, 'megusta', 'tip').flush(pagina(11, 12, false));
      await actualizar();

      expect(titulos()).toHaveLength(22);
    });

    it('[B] volver a tocar el tipo que ya está elegido no pide nada', async () => {
      pedir(0).flush(pagina(1, 3, false));
      await actualizar();

      filtro('Todas').click();
      await actualizar();

      expect(http.match(URL)).toEqual([]);
      expect(titulos()).toHaveLength(3);
    });

    it('[I] los controles de tipo van después de los de orden y antes del listado', () => {
      pedir(0).flush(pagina(1, 1, false));

      const orden = fixture.nativeElement.querySelector('.orden') as HTMLElement;

      expect(orden.nextElementSibling).toBe(fixture.nativeElement.querySelector('.filtro-tipo'));
    });
  });

  describe('orden', () => {
    const opcion = (nombre: string) =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.orden button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent!.includes(nombre))!;

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

  pruebasDeCargaAutomatica('la lista', {
    pedir: (offset) => pedir(offset),
    pedidos: () => http.match((solicitud) => solicitud.url === URL),
    pagina: (desde, cantidad, hayMas) => pagina(desde, cantidad, hayMas),
    cargados: () => fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion').length,
    botonVerMas: () => botonVerMas(),
    actualizar: () => actualizar(),
  });
});
