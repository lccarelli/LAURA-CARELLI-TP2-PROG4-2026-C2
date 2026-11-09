import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Auth } from '../../servicios/auth/auth';
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

  const escribir = async (texto: string) => {
    const campo = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    await actualizar();
  };
  const boton = () =>
    fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  const enviar = async () => {
    boton().click();
    await actualizar();
  };
  const publicar = () => http.expectOne({ method: 'POST', url: URL });
  const sinPublicar = () => http.expectNone({ method: 'POST', url: URL });
  const abrirVacio = async () => {
    pedir(0).flush(pagina(1, 0, false));
    await actualizar();
  };

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
  describe('escribir un comentario', () => {
    it('[I] con la sesión iniciada muestra la foto de quien comenta junto al cuadro de texto', async () => {
      TestBed.inject(Auth).usuario.set({ ...usuarioDePrueba, nombreUsuario: 'yo_mismo' });
      await abrirVacio();

      const foto = fixture.nativeElement.querySelector('form img') as HTMLImageElement;

      expect(foto.getAttribute('alt')).toBe('Foto de yo_mismo');
      expect(foto.getAttribute('src')).toBe('/sin-foto.svg');
    });

    it('[B] pasados los 500 caracteres el contador se marca como excedido', async () => {
      await abrirVacio();
      await escribir('a'.repeat(501));

      expect(fixture.nativeElement.querySelector('.contador-excedido')).not.toBeNull();
    });

    it('[I] muestra el cuadro de texto, el botón Comentar y el contador en 0 de 500', async () => {
      await abrirVacio();

      expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
      expect(boton().textContent).toContain('Comentar');
      expect(texto()).toContain('0 / 500');
    });

    it('[M] el contador sigue lo que se escribe', async () => {
      await abrirVacio();

      await escribir('Hola');

      expect(texto()).toContain('4 / 500');
    });

    it('[E] enviar vacío muestra que es obligatorio y no hace ningún pedido', async () => {
      await abrirVacio();

      await enviar();

      expect(texto()).toContain('Este campo es obligatorio');
      sinPublicar();
    });

    it('[E] enviar sólo espacios y saltos de línea también es obligatorio', async () => {
      await abrirVacio();
      await escribir('   \n  ');

      await enviar();

      expect(texto()).toContain('Este campo es obligatorio');
      sinPublicar();
    });

    it('[B] con 500 caracteres se envía', async () => {
      await abrirVacio();
      await escribir('a'.repeat(500));

      await enviar();

      expect(publicar().request.body).toEqual({ mensaje: 'a'.repeat(500) });
    });

    it('[B] con 501 caracteres muestra el máximo y no se envía', async () => {
      await abrirVacio();
      await escribir('a'.repeat(501));

      await enviar();

      expect(texto()).toContain('Debe tener como máximo 500 caracteres');
      expect(texto()).toContain('501 / 500');
      sinPublicar();
    });

    it('[O] publica el mensaje sin espacios sobrantes y lo muestra arriba, con el cuadro vacío', async () => {
      pedir(0).flush(pagina(1, 2, false));
      await actualizar();
      await escribir('  Qué rico  ');

      await enviar();
      const solicitud = publicar();
      expect(solicitud.request.body).toEqual({ mensaje: 'Qué rico' });
      solicitud.flush(comentario(99, { mensaje: 'Qué rico' }));
      await actualizar();

      const mensajes = [...items()].map((item) => (item as HTMLElement).textContent);
      expect(mensajes).toHaveLength(3);
      expect(mensajes[0]).toContain('Qué rico');
      expect(mensajes[1]).toContain('Comentario 1');
      expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
        '',
      );
      expect(texto()).toContain('0 / 500');
      expect(texto()).not.toContain('Este campo es obligatorio');
    });

    it('[O] avisa que se creó un comentario para que el detalle sume uno al contador', async () => {
      const avisos = vi.fn();
      fixture.componentInstance.creado.subscribe(avisos);
      await abrirVacio();
      await escribir('Hola');

      await enviar();
      publicar().flush(comentario(1));

      expect(avisos).toHaveBeenCalledTimes(1);
    });

    it('[M] después de publicar, Ver más sigue pidiendo desde la posición correcta', async () => {
      pedir(0).flush(pagina(1, 10, true));
      await actualizar();
      await escribir('Nuevo');
      await enviar();
      publicar().flush(comentario(99));
      await actualizar();

      botonVerMas()!.click();

      const solicitud = pedir(11);
      expect(solicitud.request.params.get('offset')).toBe('11');
      solicitud.flush(pagina(11, 1, false));
    });

    it('[B] mientras se envía, el botón queda deshabilitado y un segundo clic no repite el pedido', async () => {
      await abrirVacio();
      await escribir('Hola');

      await enviar();
      await enviar();

      expect(boton().disabled).toBe(true);
      expect(boton().textContent).toContain('Enviando');
      publicar().flush(comentario(1));
    });

    it('[E] si el servidor lo rechaza, muestra el motivo y conserva lo escrito para reintentar', async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();
      await escribir('Hola');

      await enviar();
      publicar().flush(
        { codigo: 'PUBLICACION_NO_ENCONTRADA' },
        { status: 404, statusText: 'Not Found' },
      );
      await actualizar();

      expect(texto()).toContain('No se pudo publicar el comentario');
      expect(items().length).toBe(1);
      expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
        'Hola',
      );
      expect(boton().disabled).toBe(false);
    });

    it('[E] si la sesión venció, lo informa y no agrega el comentario', async () => {
      const avisos = vi.fn();
      fixture.componentInstance.creado.subscribe(avisos);
      await abrirVacio();
      await escribir('Hola');

      await enviar();
      publicar().flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      expect(texto()).toContain('Tu sesión no es válida o venció');
      expect(items().length).toBe(0);
      expect(avisos).not.toHaveBeenCalled();
    });

    it('[S] un mensaje con HTML se publica como texto y no se interpreta', async () => {
      await abrirVacio();
      await escribir('<b>hola</b>');

      await enviar();
      publicar().flush(comentario(1, { mensaje: '<b>hola</b>' }));
      await actualizar();

      expect(fixture.nativeElement.querySelector('li.comentario b')).toBeNull();
      expect(texto()).toContain('<b>hola</b>');
    });
  });

  describe('editar un comentario de la lista', () => {
    it('[O] se edita en su lugar, queda marcado como editado y el resto no cambia', async () => {
      TestBed.inject(Auth).usuario.set(usuarioDePrueba);
      pedir(0).flush(pagina(1, 3, false));
      await actualizar();
      const primero = items()[0] as HTMLElement;
      (primero.querySelector('button') as HTMLButtonElement).click();
      await actualizar();
      const cuadro = primero.querySelector('textarea') as HTMLTextAreaElement;
      cuadro.value = 'Cambiado';
      cuadro.dispatchEvent(new Event('input'));
      await actualizar();

      (primero.querySelector('button[type="submit"]') as HTMLButtonElement).click();
      http
        .expectOne({ method: 'PUT', url: `${URL}/c1` })
        .flush(comentario(1, { mensaje: 'Cambiado', modificado: true }));
      await actualizar();

      const mensajes = [...items()].map((item) => (item as HTMLElement).textContent);
      expect(mensajes).toHaveLength(3);
      expect(mensajes[0]).toContain('Cambiado');
      expect(mensajes[0]).toContain('(editado)');
      expect(mensajes[1]).toContain('Comentario 2');
      expect(mensajes[1]).not.toContain('(editado)');
    });

    it('[S] el botón Editar sólo aparece en los comentarios de quien tiene la sesión', async () => {
      TestBed.inject(Auth).usuario.set(usuarioDePrueba);
      pedir(0).flush({
        ...pagina(1, 0, false),
        datos: [
          comentario(1),
          comentario(2, {
            usuario: { _id: 'u9', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' },
          }),
        ],
      });
      await actualizar();

      const conBoton = [...items()].map((item) =>
        (item as HTMLElement).textContent?.includes('Editar'),
      );

      expect(conBoton).toEqual([true, false]);
    });
  });
});
