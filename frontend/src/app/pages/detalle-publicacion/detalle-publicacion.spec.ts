import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../interfaces/publicacion';
import { DetallePublicacion } from './detalle-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
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
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'id1' }) } },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePublicacion);
    await fixture.whenStable();
  });

  it('[I] pide la publicación por el id de la dirección y muestra Cargando', () => {
    http.expectOne({ method: 'GET', url: `${URL}/id1` });

    expect(fixture.nativeElement.textContent).toContain('Cargando');
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
            fecha: '2026-10-22T15:30:00.000Z',
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
    expect(detalle.querySelectorAll('.metrica')).toHaveLength(2);
    expect(detalle.textContent).toContain('Laura Carelli');
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
});
