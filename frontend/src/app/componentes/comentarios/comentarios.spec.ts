import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Comentario, PaginaComentarios } from '../../interfaces/comentario';
import { Comentarios } from './comentarios';

const URL = `${environment.API_URL}/publicaciones/p1/comentarios`;

const comentario = (numero: number, cambios: Partial<Comentario> = {}): Comentario => ({
  _id: `c${numero}`,
  publicacion: 'p1',
  usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  mensaje: `Comentario ${numero}`,
  fecha: '2026-10-22T15:30:00.000Z',
  modificado: false,
  ...cambios,
});

const pagina = (desde: number, cantidad: number, hayMas: boolean): PaginaComentarios => ({
  datos: Array.from({ length: cantidad }, (_, i) => comentario(desde + i)),
  offset: desde - 1,
  limit: 10,
  hayMas,
});

describe('Comentarios', () => {
  let fixture: ComponentFixture<Comentarios>;
  let http: HttpTestingController;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const pedir = (offset: number) =>
    http.expectOne(
      (p) =>
        p.url === URL &&
        p.params.get('offset') === String(offset) &&
        p.params.get('limit') === '10',
    );

  const texto = () => fixture.nativeElement.textContent as string;
  const items = () => fixture.nativeElement.querySelectorAll('li.comentario');
  const botonVerMas = () =>
    [...fixture.nativeElement.querySelectorAll('button')].find((boton) =>
      (boton as HTMLButtonElement).textContent?.includes('Ver más comentarios'),
    ) as HTMLButtonElement | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Comentarios],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Comentarios);
    fixture.componentRef.setInput('publicacionId', 'p1');
    await actualizar();
  });

  it('[I] pide la primera página de los comentarios de la publicación y muestra Cargando', () => {
    pedir(0);

    expect(texto()).toContain('Cargando');
  });

  it('[Z] sin comentarios muestra el aviso de lista vacía y ningún botón', async () => {
    pedir(0).flush(pagina(1, 0, false));
    await actualizar();

    expect(texto()).toContain('Todavía no hay comentarios');
    expect(items().length).toBe(0);
    expect(botonVerMas()).toBeUndefined();
  });

  it('[O] muestra el autor, la fecha y el mensaje de cada comentario, en el orden recibido', async () => {
    pedir(0).flush(pagina(1, 3, false));
    await actualizar();

    const lista = [...items()].map((item) => (item as HTMLElement).textContent);

    expect(lista).toHaveLength(3);
    expect(lista[0]).toContain('@laura_c');
    expect(lista[0]).toContain('22/10/2026');
    expect(lista[0]).toContain('Comentario 1');
    expect(lista[2]).toContain('Comentario 3');
  });

  it('[M] el mensaje conserva los saltos de línea', async () => {
    pedir(0).flush({ ...pagina(1, 0, false), datos: [comentario(1, { mensaje: 'a\nb' })] });
    await actualizar();

    const mensaje = fixture.nativeElement.querySelector('li.comentario p') as HTMLElement;

    expect(mensaje.classList).toContain('whitespace-pre-line');
    expect(mensaje.textContent).toBe('a\nb');
  });

  it('[S] un mensaje con HTML se muestra como texto y no se interpreta', async () => {
    pedir(0).flush({
      ...pagina(1, 0, false),
      datos: [comentario(1, { mensaje: '<img src=x onerror=alert(1)>' })],
    });
    await actualizar();

    expect(fixture.nativeElement.querySelector('li.comentario img[src="x"]')).toBeNull();
    expect(texto()).toContain('<img src=x onerror=alert(1)>');
  });

  it('[I] si el autor no tiene foto usa la imagen por defecto', async () => {
    pedir(0).flush(pagina(1, 1, false));
    await actualizar();

    const foto = fixture.nativeElement.querySelector('li.comentario img') as HTMLImageElement;

    expect(foto.getAttribute('src')).toBe('/sin-foto.svg');
    expect(foto.getAttribute('alt')).toBe('Foto de laura_c');
  });

  it('[M] con más páginas muestra Ver más comentarios y, al apretarlo, pide la siguiente', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush(pagina(11, 2, false));
    await actualizar();

    expect(items().length).toBe(12);
    expect(botonVerMas()).toBeUndefined();
  });

  it('[M] cargar más conserva los anteriores y agrega los nuevos al final', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush(pagina(11, 2, false));
    await actualizar();

    const mensajes = [...items()].map((item) => (item as HTMLElement).textContent);

    expect(mensajes[0]).toContain('Comentario 1');
    expect(mensajes[9]).toContain('Comentario 10');
    expect(mensajes[10]).toContain('Comentario 11');
    expect(mensajes[11]).toContain('Comentario 12');
  });

  it('[S] si la página nueva trae un comentario que ya estaba, no lo repite', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush({ ...pagina(10, 3, false) });
    await actualizar();

    expect(items().length).toBe(12);
  });

  it('[B] mientras carga la página siguiente no se puede pedir otra', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();
    fixture.componentInstance.cargarMas();
    fixture.componentInstance.cargarMas();

    http.expectOne((p) => p.url === URL && p.params.get('offset') === '10');
    await actualizar();

    expect(botonVerMas()).toBeUndefined();
  });

  it('[E] si falla la carga muestra el aviso con el motivo y no el texto de lista vacía', async () => {
    pedir(0).flush(
      { codigo: 'PUBLICACION_NO_ENCONTRADA' },
      { status: 404, statusText: 'Not Found' },
    );
    await actualizar();

    expect(texto()).toContain('No se pudieron cargar los comentarios');
    expect(texto()).not.toContain('Todavía no hay comentarios');
  });

  it('[E] si falla la página siguiente conserva los comentarios ya cargados y deja reintentar', async () => {
    pedir(0).flush(pagina(1, 10, true));
    await actualizar();

    botonVerMas()!.click();
    pedir(10).flush(null, { status: 500, statusText: 'Error' });
    await actualizar();

    expect(items().length).toBe(10);
    expect(texto()).toContain('No se pudieron cargar los comentarios');
    expect(botonVerMas()).toBeDefined();
  });

  it('[I] al destruirse cancela el pedido que estaba en curso', () => {
    const solicitud = pedir(0);

    fixture.destroy();

    expect(solicitud.cancelled).toBe(true);
  });
});
