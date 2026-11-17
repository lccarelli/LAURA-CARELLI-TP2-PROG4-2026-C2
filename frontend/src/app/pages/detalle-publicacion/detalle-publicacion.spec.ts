import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Location } from '@angular/common';
import { By } from '@angular/platform-browser';
import { Historial } from '../../servicios/historial/historial';
import { ModalCompartir } from '../../componentes/modal-compartir/modal-compartir';
import { Publicacion } from '../../interfaces/publicacion';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { usuarioDePrueba } from '../../../testing/usuario';
import { DetallePublicacion } from './detalle-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { proveerRutaConId } from '../../../testing/ruta';
import { publicacionDePrueba } from '../../../testing/publicacion';

const URL = `${environment.API_URL}/publicaciones`;

describe('DetallePublicacion', () => {
  let fixture: ComponentFixture<DetallePublicacion>;
  let http: HttpTestingController;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const abrir = async (datos: Publicacion) => {
    http.expectOne({ method: 'GET', url: `${URL}/id1` }).flush(datos);
    await actualizar();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePublicacion],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerRutaConId('id1'),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePublicacion);
    await fixture.whenStable();
  });

  it('[I] pide la publicación por el id de la dirección', () => {
    const solicitud = http.expectOne({ method: 'GET', url: `${URL}/id1` });

    expect(solicitud.request.method).toBe('GET');
  });

  it('[I] debajo de la publicación pide y muestra sus comentarios', async () => {
    await abrir(publicacionDePrueba(1));

    http
      .expectOne((p) => p.url === `${URL}/id1/comentarios` && p.params.get('offset') === '0')
      .flush({
        datos: [
          {
            _id: 'c1',
            publicacion: 'id1',
            usuario: { _id: 'u2', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' },
            mensaje: 'Me salió riquísimo',
            fecha: '2026-10-22T15:30:00',
            modificado: false,
          },
        ],
        offset: 0,
        limit: 10,
        hayMas: false,
      });
    await actualizar();

    const seccion = fixture.nativeElement.querySelector('app-comentarios') as HTMLElement;
    expect(seccion.textContent).toContain('Comentarios');
    expect(seccion.textContent).toContain('Me salió riquísimo');
  });

  it('[O] al publicar un comentario, el contador de la publicación sube en uno', async () => {
    await abrir(publicacionDePrueba(1));
    http
      .expectOne((p) => p.url === `${URL}/id1/comentarios` && p.method === 'GET')
      .flush({ datos: [], offset: 0, limit: 10, hayMas: false });
    await actualizar();
    expect(fixture.nativeElement.querySelector('[aria-label="2 comentarios"]')).not.toBeNull();

    const campo = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = 'Muy rico';
    campo.dispatchEvent(new Event('input'));
    await actualizar();
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    http.expectOne({ method: 'POST', url: `${URL}/id1/comentarios` }).flush({
      _id: 'c1',
      publicacion: 'id1',
      usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
      mensaje: 'Muy rico',
      fecha: '2026-10-22T15:30:00',
      modificado: false,
    });
    await actualizar();

    expect(fixture.nativeElement.querySelector('[aria-label="3 comentarios"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="2 comentarios"]')).toBeNull();
  });

  it('[E] si la publicación no carga, no pide comentarios', async () => {
    http
      .expectOne({ method: 'GET', url: `${URL}/id1` })
      .flush({ codigo: 'PUBLICACION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
    await actualizar();

    http.expectNone((p) => p.url === `${URL}/id1/comentarios`);
    expect(fixture.nativeElement.querySelector('app-comentarios')).toBeNull();
  });

  it('[I] ocupa toda la pantalla con una X para cerrar que vuelve al muro', async () => {
    await abrir(publicacionDePrueba(1));

    const cerrar = fixture.nativeElement.querySelector('a.cerrar-detalle') as HTMLAnchorElement;
    expect(fixture.nativeElement.querySelector('.pagina-detalle')).not.toBeNull();
    expect(cerrar.getAttribute('href')).toBe('/publicaciones');
    expect(cerrar.getAttribute('aria-label')).toBe('Cerrar');
  });

  it('[I] la tecla Escape vuelve al muro', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await abrir(publicacionDePrueba(1));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
  });

  describe('al cerrar', () => {
    const conHistorial = (puedeVolver: boolean) => {
      vi.spyOn(TestBed.inject(Historial), 'puedeVolver').mockReturnValue(puedeVolver);
      return {
        atras: vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined),
        navegar: vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true),
      };
    };
    const cerrarConLaX = () =>
      (fixture.nativeElement.querySelector('a.cerrar-detalle') as HTMLAnchorElement).click();

    it('[O] si se llegó desde otra pantalla de la app, la X vuelve a esa pantalla (un paso atrás)', async () => {
      const { atras, navegar } = conHistorial(true);
      await abrir(publicacionDePrueba(1));

      cerrarConLaX();

      expect(atras).toHaveBeenCalledTimes(1);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('[O] la tecla Escape también vuelve un paso atrás', async () => {
      const { atras } = conHistorial(true);
      await abrir(publicacionDePrueba(1));

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(atras).toHaveBeenCalledTimes(1);
    });

    it('[O] el enlace Volver del aviso de error también vuelve un paso atrás', async () => {
      const { atras } = conHistorial(true);
      http
        .expectOne({ method: 'GET', url: `${URL}/id1` })
        .flush({ codigo: 'PUBLICACION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
      await actualizar();

      (fixture.nativeElement.querySelector('.pagina a.enlace') as HTMLAnchorElement).click();

      expect(atras).toHaveBeenCalledTimes(1);
    });

    it('[S] si se entró directo (enlace, aviso del celular), la X lleva al muro de publicaciones', async () => {
      const { atras, navegar } = conHistorial(false);
      await abrir(publicacionDePrueba(1));

      cerrarConLaX();

      expect(atras).not.toHaveBeenCalled();
      expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
    });

    it('[I] el enlace conserva el destino por defecto, por si se abre en otra pestaña', async () => {
      conHistorial(false);
      await abrir(publicacionDePrueba(1));

      const cerrar = fixture.nativeElement.querySelector('a.cerrar-detalle') as HTMLAnchorElement;

      expect(cerrar.getAttribute('href')).toBe('/publicaciones');
    });
  });

  describe('compartir', () => {
    it('[O] con sesión: a la izquierda guardar y compartir; a la derecha me gusta y los comentarios', async () => {
      await abrir(publicacionDePrueba(1));

      const botones = Array.from(
        fixture.nativeElement.querySelectorAll('.metricas-detalle button'),
      ).map((boton) => (boton as HTMLElement).getAttribute('aria-label'));

      expect(botones).toEqual(['Guardar', 'Compartir', expect.stringContaining('me gusta')]);
      const hijos = Array.from(fixture.nativeElement.querySelectorAll('.metricas-detalle > *'));
      expect(hijos.at(-2)).toBe(fixture.nativeElement.querySelector('app-boton-me-gusta'));
      expect(fixture.nativeElement.querySelector('app-boton-me-gusta').classList).toContain(
        'pin-derecha',
      );
    });

    it('[S] al compartir muestra con cuántas personas y al abrir de nuevo lo borra', async () => {
      await abrir(publicacionDePrueba(1));
      const boton = fixture.nativeElement.querySelector('app-boton-compartir') as HTMLElement;
      (boton.querySelector('button') as HTMLButtonElement).click();
      fixture.detectChanges();
      fixture.debugElement.query(By.directive(ModalCompartir)).componentInstance.compartida.emit(2);
      await actualizar();

      expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
        'Compartida con 2',
      );

      (boton.querySelector('button') as HTMLButtonElement).click();
      await actualizar();
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    });

    it('[I] en la vista pública (sin sesión) no hay botón Compartir', async () => {
      TestBed.resetTestingModule();
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
      http
        .expectOne({ method: 'GET', url: `${environment.API_URL}/publico/publicaciones/id1` })
        .flush(publicacionDePrueba(1));
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-boton-compartir')).toBeNull();
    });
  });

  it('[I] es una página con enlace para volver, sin ventana flotante', async () => {
    await abrir(publicacionDePrueba(1));

    expect(fixture.nativeElement.querySelector('a[href="/publicaciones"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pagina .estado-carga')).toBeNull();
  });

  it('[E] si la publicación no existe muestra el aviso y el enlace para volver', async () => {
    http
      .expectOne({ method: 'GET', url: `${URL}/id1` })
      .flush({ codigo: 'PUBLICACION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La publicación no existe');
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/publicaciones"]')).not.toBeNull();
  });

  it('[I] el detalle muestra el tipo, los ingredientes y los pasos numerados', async () => {
    await abrir({
      ...publicacionDePrueba(1),
      tipo: 'receta',
      ingredientes: [
        { nombre: 'Pan', cantidad: 2, unidad: 'unidad' },
        { nombre: 'Sal', unidad: 'a_gusto' },
      ],
      pasos: [{ texto: 'Tostar' }, { texto: 'Untar' }],
    });

    const detalle = fixture.nativeElement as HTMLElement;
    expect(detalle.textContent).toContain('Receta');
    expect(detalle.querySelectorAll('ul li')).toHaveLength(2);
    expect(detalle.querySelectorAll('ol li')).toHaveLength(2);
    expect(detalle.querySelector('ol li')!.textContent).toContain('1');
  });

  it('[I] el detalle muestra la ficha con el costo y sólo los datos que hay', async () => {
    await abrir({
      ...publicacionDePrueba(1),
      tipo: 'receta',
      porciones: 4,
      tiempoMinutos: 19,
      costo: 2,
    });

    const detalle = fixture.nativeElement as HTMLElement;
    expect(detalle.querySelector('.ficha')!.textContent).toContain('Porciones');
    expect(detalle.querySelector('.ficha')!.textContent).toContain('19 min');
    expect(detalle.querySelector('.ficha')!.textContent).not.toContain('Calorías');
    expect(detalle.querySelector('.costo-apagado')!.textContent).toBe('$$');
    expect(detalle.querySelector('.ficha')!.textContent).toContain('Costo: $$');
  });

  it('[I] sin datos de ficha el detalle no muestra el bloque', async () => {
    await abrir(publicacionDePrueba(1));

    expect(fixture.nativeElement.querySelector('.ficha')).toBeNull();
  });

  it('[I] muestra el título, el mensaje, el autor y las métricas', async () => {
    await abrir(publicacionDePrueba(1));

    const detalle = fixture.nativeElement as HTMLElement;
    expect(detalle.textContent).toContain('Título 1');
    expect(detalle.textContent).toContain('Mensaje 1');
    expect(detalle.querySelectorAll('.metrica')).toHaveLength(4);
    expect(detalle.textContent).toContain('Laura Carelli');
  });

  it.each([
    ['[Z] sin guardar ofrece guardarla', undefined, 'false'],
    ['[I] ya guardada llega marcada', true, 'true'],
  ])('%s', async (_caso, guardada, marcada) => {
    await abrir(publicacionDePrueba(1, { guardada }));

    const boton = fixture.nativeElement.querySelector('app-boton-guardar button') as HTMLElement;

    expect(boton.getAttribute('aria-pressed')).toBe(marcada);
  });

  it('[O] el nombre de quien publicó lleva a su perfil', async () => {
    await abrir(
      publicacionDePrueba(1, { usuario: { ...publicacionDePrueba(1).usuario, _id: 'u9' } }),
    );

    const enlace = fixture.nativeElement.querySelector('a.enlace-autor') as HTMLAnchorElement;

    expect(enlace.getAttribute('href')).toBe('/perfil/u9');
    expect(enlace.textContent).toContain('Laura Carelli');
  });

  it('[E] con ingredientes y pasos en el formato viejo (texto) no muestra esas secciones', async () => {
    const vieja = {
      ...publicacionDePrueba(1),
      ingredientes: '2 huevos\n1 taza de harina',
      pasos: 'Mezclar\nHornear',
    } as unknown as Publicacion;

    await abrir(vieja);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).not.toContain('undefined');
    expect(fixture.nativeElement.querySelector('.ingrediente')).toBeNull();
    expect(fixture.nativeElement.querySelector('.numero-paso')).toBeNull();
  });

  it('[E] descarta los ingredientes y pasos inválidos y muestra sólo los válidos', async () => {
    const mezclada = {
      ...publicacionDePrueba(1),
      ingredientes: [
        { nombre: 'Harina', cantidad: 2, unidad: 'taza' },
        { nombre: 'Sal', unidad: 'a_gusto' },
        { nombre: 'Raro', cantidad: 1, unidad: 'inventada' },
        { nombre: '', cantidad: 1, unidad: 'g' },
        { nombre: 'Negativo', cantidad: -3, unidad: 'g' },
        'texto suelto',
        null,
      ],
      pasos: ['Mezclar', '', 7, null, 'Hornear'],
    } as unknown as Publicacion;

    await abrir(mezclada);

    const ingredientes = fixture.nativeElement.querySelectorAll('.ingrediente');
    const pasos = fixture.nativeElement.querySelectorAll('.numero-paso');
    expect(ingredientes.length).toBe(2);
    expect(pasos.length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('[E] ignora los datos de ficha fuera de rango o que no son números', async () => {
    const rara = {
      ...publicacionDePrueba(1),
      porciones: '4; db.drop()',
      tiempoMinutos: -5,
      costo: 9,
      calorias: 2.5,
    } as unknown as Publicacion;

    await abrir(rara);

    expect(fixture.nativeElement.querySelector('.ficha')).toBeNull();
  });

  it('[O] cada paso muestra su título y todas sus fotos de preparación', async () => {
    await abrir({
      ...publicacionDePrueba(1),
      tipo: 'receta',
      pasos: [
        {
          titulo: 'La masa',
          texto: 'Mezclar',
          imagenes: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
        },
        { texto: 'Hornear' },
      ],
    });

    const fotos = fixture.nativeElement.querySelectorAll(
      '.paso-imagen',
    ) as NodeListOf<HTMLImageElement>;
    expect(fotos).toHaveLength(2);
    expect(Array.from(fotos).map((foto) => foto.getAttribute('src'))).toEqual([
      'https://img.test/a.jpg',
      'https://img.test/b.jpg',
    ]);
    expect(fotos[1].getAttribute('alt')).toBe('Foto 2 del paso 1');
    expect(fixture.nativeElement.querySelectorAll('.paso-titulo-detalle')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.paso-titulo-detalle').textContent).toContain(
      'La masa',
    );
  });

  it('[O] un paso sin descripción se ve con su título y su foto, sin texto vacío', async () => {
    await abrir({
      ...publicacionDePrueba(1),
      tipo: 'receta',
      pasos: [{ titulo: 'Servir' }, { imagenes: ['https://img.test/a.jpg'] }],
    });

    expect(fixture.nativeElement.querySelectorAll('.numero-paso')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.paso-titulo-detalle').textContent).toContain(
      'Servir',
    );
    expect(fixture.nativeElement.querySelectorAll('.paso-imagen')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.paso-contenido .texto-publicacion')).toBeNull();
  });

  it('[E] ignora fotos de pasos que no son texto y títulos que no son texto', async () => {
    const rara = {
      ...publicacionDePrueba(1),
      tipo: 'receta',
      pasos: [{ titulo: 5, texto: 'Mezclar', imagenes: [null, 7, '', 'https://img.test/ok.jpg'] }],
    } as unknown as Publicacion;

    await abrir(rara);

    expect(fixture.nativeElement.querySelectorAll('.paso-imagen')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.paso-titulo-detalle')).toBeNull();
  });

  it('[O] la ficha dice Unidades cuando la receta rinde unidades y Porciones en cualquier otro caso', async () => {
    await abrir({
      ...publicacionDePrueba(1),
      tipo: 'receta',
      porciones: 12,
      tipoRinde: 'unidades',
    });
    expect(fixture.nativeElement.querySelector('.ficha').textContent).toContain('Unidades');
    expect(fixture.nativeElement.querySelector('.ficha').textContent).toContain('12');
  });

  it('[O] los pasos guardados como texto (formato anterior) se siguen viendo', async () => {
    const anterior = {
      ...publicacionDePrueba(1),
      tipo: 'receta',
      pasos: ['Tostar', 'Untar'],
    } as unknown as Publicacion;

    await abrir(anterior);

    expect(fixture.nativeElement.querySelectorAll('.numero-paso')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Untar');
  });

  describe('me gusta', () => {
    const botonMeGusta = () =>
      fixture.nativeElement.querySelector('app-boton-me-gusta button') as HTMLButtonElement;
    const sinComentarios = async () => {
      http
        .expectOne((p) => p.url === `${URL}/id1/comentarios` && p.method === 'GET')
        .flush({ datos: [], offset: 0, limit: 10, hayMas: false });
      await actualizar();
    };

    it('[O] dentro de la publicación hay un botón para dar me gusta, con la cantidad', async () => {
      await abrir({ ...publicacionDePrueba(1), cantidadMeGusta: 7, meGusta: false });
      await sinComentarios();

      expect(botonMeGusta().getAttribute('aria-label')).toBe('Dar me gusta (7)');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('false');
    });

    it('[O] dar me gusta pide POST y muestra la cantidad nueva y el botón marcado', async () => {
      await abrir({ ...publicacionDePrueba(1), cantidadMeGusta: 7, meGusta: false });
      await sinComentarios();

      botonMeGusta().click();
      http
        .expectOne({ method: 'POST', url: `${URL}/id1/megusta` })
        .flush({ meGusta: true, cantidadMeGusta: 8 });
      await actualizar();

      expect(botonMeGusta().getAttribute('aria-label')).toBe('Quitar me gusta (8)');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('true');
    });

    it('[S] si ya había dado me gusta, el botón sale marcado y quitarlo pide DELETE', async () => {
      await abrir({ ...publicacionDePrueba(1), cantidadMeGusta: 7, meGusta: true });
      await sinComentarios();
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('true');

      botonMeGusta().click();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1/megusta` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await actualizar();

      expect(botonMeGusta().getAttribute('aria-label')).toBe('Dar me gusta (6)');
    });

    it('[E] si falla, muestra el aviso en la página y deja la cantidad como estaba', async () => {
      await abrir({ ...publicacionDePrueba(1), cantidadMeGusta: 7, meGusta: false });
      await sinComentarios();

      botonMeGusta().click();
      http
        .expectOne({ method: 'POST', url: `${URL}/id1/megusta` })
        .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Tu sesión no es válida o venció',
      );
      expect(botonMeGusta().getAttribute('aria-label')).toBe('Dar me gusta (7)');
    });
  });

  describe('eliminar', () => {
    const entrar = (usuario: Usuario | null) => TestBed.inject(Auth).usuario.set(usuario);
    const otraPersona: Usuario = { ...usuarioDePrueba, _id: 'u2', nombreUsuario: 'ana_g' };
    const administrador: Usuario = { ...otraPersona, perfil: 'administrador' };
    const abrirYMostrar = async () => {
      await abrir(publicacionDePrueba(1));
      http
        .expectOne((p) => p.url === `${URL}/id1/comentarios` && p.method === 'GET')
        .flush({ datos: [], offset: 0, limit: 10, hayMas: false });
      await actualizar();
    };
    const botonEliminar = () =>
      fixture.nativeElement.querySelector('app-eliminar-publicacion button') as HTMLButtonElement;
    const botonesDeEliminar = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'app-eliminar-publicacion button',
        ) as NodeListOf<HTMLButtonElement>,
      );

    const enlaceEditar = () =>
      fixture.nativeElement.querySelector(
        'a[href="/publicaciones/id1/editar"]',
      ) as HTMLElement | null;

    it.each([
      ['[Z] sin sesión no ofrece editar', null, false],
      ['[O] quien publicó ve el botón para editar', usuarioDePrueba, true],
      [
        '[E] una persona con perfil administrador no edita publicaciones de otra',
        administrador,
        false,
      ],
      ['[E] una persona común no edita publicaciones de otra', otraPersona, false],
    ])('%s', async (_nombre, quien, debeVerlo) => {
      entrar(quien);
      await abrirYMostrar();

      expect(enlaceEditar() !== null).toBe(debeVerlo);
    });

    it('[I] una publicación editada lo indica y una que no, no', async () => {
      entrar(usuarioDePrueba);
      await abrir(publicacionDePrueba(1, { fechaEdicion: '2026-10-23T10:00:00' }));
      expect(fixture.nativeElement.textContent).toContain('Editada');
    });

    it('[Z] una publicación sin ediciones no muestra Editada', async () => {
      entrar(usuarioDePrueba);
      await abrir(publicacionDePrueba(1));
      expect(fixture.nativeElement.textContent).not.toContain('Editada');
    });

    it('[Z] sin sesión no ofrece eliminar', async () => {
      entrar(null);
      await abrirYMostrar();

      expect(botonEliminar()).toBeNull();
    });

    it('[O] quien publicó ve el botón para eliminar su publicación', async () => {
      entrar(usuarioDePrueba);
      await abrirYMostrar();

      expect(botonEliminar().textContent).toContain('Eliminar publicación');
    });

    it('[S] una persona con perfil administrador lo ve en la publicación de otra', async () => {
      entrar(administrador);
      await abrirYMostrar();

      expect(botonEliminar().textContent).toContain('Eliminar publicación');
    });

    it('[E] una persona común no lo ve en la publicación de otra', async () => {
      entrar(otraPersona);
      await abrirYMostrar();

      expect(botonEliminar()).toBeNull();
    });

    it('[O] confirmar elimina la publicación y vuelve al listado', async () => {
      entrar(administrador);
      await abrirYMostrar();
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      botonEliminar().click();
      await actualizar();
      botonesDeEliminar()[0].click();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await actualizar();

      expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
    });

    it('[O] cancelar no elimina ni sale de la página', async () => {
      entrar(administrador);
      await abrirYMostrar();
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      botonEliminar().click();
      await actualizar();
      botonesDeEliminar()[1].click();
      await actualizar();

      http.expectNone({ method: 'DELETE', url: `${URL}/id1` });
      expect(navegar).not.toHaveBeenCalled();
      expect(botonEliminar().textContent).toContain('Eliminar publicación');
    });

    it('[E] si el servidor no deja eliminarla, avisa en la página y se queda', async () => {
      entrar(usuarioDePrueba);
      await abrirYMostrar();
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      botonEliminar().click();
      await actualizar();
      botonesDeEliminar()[0].click();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1` })
        .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Tu sesión no es válida o venció',
      );
      expect(navegar).not.toHaveBeenCalled();
    });
  });

  describe('al llegar desde una notificación', () => {
    const abrirConFragmento = async (fragmento: string | null) => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [DetallePublicacion],
        providers: [
          proveerIdiomaDePrueba(),
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                paramMap: convertToParamMap({ id: 'id1' }),
                fragment: fragmento,
              },
            },
          },
        ],
      }).compileComponents();
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(DetallePublicacion);
      await fixture.whenStable();
      await abrir(publicacionDePrueba(1));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('[S] con #comentarios baja hasta los comentarios', async () => {
      const bajar = vi.fn();
      Element.prototype.scrollIntoView = bajar;

      await abrirConFragmento('comentarios');

      expect(bajar).toHaveBeenCalledTimes(1);
      expect(bajar.mock.contexts[0]).toBe(document.getElementById('titulo-comentarios'));
    });

    it('[B] sin fragmento no se desplaza', async () => {
      const bajar = vi.fn();
      Element.prototype.scrollIntoView = bajar;

      await abrirConFragmento(null);

      expect(bajar).not.toHaveBeenCalled();
    });
  });
});
