import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../interfaces/publicacion';
import { DetallePublicacion } from './detalle-publicacion';
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

  it('[I] ocupa toda la pantalla con una X para cerrar que vuelve al muro', async () => {
    await abrir(publicacion(1));

    const cerrar = fixture.nativeElement.querySelector('a.cerrar-detalle') as HTMLAnchorElement;
    expect(fixture.nativeElement.querySelector('.pagina-detalle')).not.toBeNull();
    expect(cerrar.getAttribute('href')).toBe('/publicaciones');
    expect(cerrar.getAttribute('aria-label')).toBe('Cerrar');
  });

  it('[I] la tecla Escape vuelve al muro', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await abrir(publicacion(1));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
  });

  it('[I] es una página con enlace para volver, sin ventana flotante', async () => {
    await abrir(publicacion(1));

    expect(fixture.nativeElement.querySelector('a[href="/publicaciones"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
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
      ...publicacion(1),
      tipo: 'receta',
      ingredientes: [
        { nombre: 'Pan', cantidad: 2, unidad: 'unidad' },
        { nombre: 'Sal', unidad: 'a_gusto' },
      ],
      pasos: ['Tostar', 'Untar'],
    });

    const detalle = fixture.nativeElement as HTMLElement;
    expect(detalle.textContent).toContain('Receta');
    expect(detalle.querySelectorAll('ul li')).toHaveLength(2);
    expect(detalle.querySelectorAll('ol li')).toHaveLength(2);
    expect(detalle.querySelector('ol li')!.textContent).toContain('1');
  });

  it('[I] el detalle muestra la ficha con el costo y sólo los datos que hay', async () => {
    await abrir({ ...publicacion(1), tipo: 'receta', porciones: 4, tiempoMinutos: 19, costo: 2 });

    const detalle = fixture.nativeElement as HTMLElement;
    expect(detalle.querySelector('.ficha')!.textContent).toContain('Porciones');
    expect(detalle.querySelector('.ficha')!.textContent).toContain('19 min');
    expect(detalle.querySelector('.ficha')!.textContent).not.toContain('Calorías');
    expect(detalle.querySelector('.costo-apagado')!.textContent).toBe('$$');
    expect(detalle.querySelector('.ficha')!.textContent).toContain('Costo: $$');
  });

  it('[I] sin datos de ficha el detalle no muestra el bloque', async () => {
    await abrir(publicacion(1));

    expect(fixture.nativeElement.querySelector('.ficha')).toBeNull();
  });

  it('[I] muestra el título, el mensaje, el autor y las métricas', async () => {
    await abrir(publicacion(1));

    const detalle = fixture.nativeElement as HTMLElement;
    expect(detalle.textContent).toContain('Título 1');
    expect(detalle.textContent).toContain('Mensaje 1');
    expect(detalle.querySelectorAll('.metrica')).toHaveLength(2);
    expect(detalle.textContent).toContain('Laura Carelli');
  });
});
