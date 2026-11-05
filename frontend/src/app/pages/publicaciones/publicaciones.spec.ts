import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
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
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Publicaciones);
    await fixture.whenStable();
  });

  it('[I] el detalle muestra el tipo, los ingredientes y los pasos numerados', async () => {
    pedir(0).flush({
      ...pagina(1, 1, false),
      datos: [
        { ...publicacion(1), tipo: 'receta', ingredientes: 'Pan\nManteca', pasos: 'Tostar\nUntar' },
      ],
    });
    await actualizar();

    fixture.nativeElement.querySelector('.pin').click();
    await actualizar();

    const detalle = fixture.nativeElement.querySelector('app-ventana') as HTMLElement;
    expect(detalle.textContent).toContain('Receta');
    expect(detalle.querySelectorAll('ul li')).toHaveLength(2);
    expect(detalle.querySelectorAll('ol li')).toHaveLength(2);
    expect(detalle.querySelector('ol li')!.textContent).toContain('1');
  });

  it('[I] al tocar una publicación se abre el detalle con el mensaje y el autor, y se cierra', async () => {
    pedir(0).flush(pagina(1, 1, false));
    await actualizar();

    fixture.nativeElement.querySelector('.pin').click();
    await actualizar();

    const detalle = fixture.nativeElement.querySelector('app-ventana') as HTMLElement;
    expect(detalle.textContent).toContain('Título 1');
    expect(detalle.textContent).toContain('Mensaje 1');
    expect(detalle.querySelectorAll('.metrica')).toHaveLength(2);
    expect(detalle.textContent).toContain('Laura Carelli');

    fixture.nativeElement.querySelector('app-ventana .boton-icono').click();
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-ventana')).toBeNull();
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

    expect(fixture.nativeElement.querySelector('app-modal')).not.toBeNull();
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

    expect(fixture.nativeElement.querySelector('app-modal')).not.toBeNull();
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

  describe('ventana para crear', () => {
    const ventana = () => fixture.nativeElement.querySelector('app-ventana');
    const boton = () => fixture.nativeElement.querySelector('.boton-flotante') as HTMLButtonElement;

    beforeEach(async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();
    });

    it('[Z] al entrar sólo se ve el botón +, no la ventana', () => {
      expect(boton()).not.toBeNull();
      expect(ventana()).toBeNull();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('[I] el botón flotante dice con texto qué hace', () => {
      expect(boton().textContent).toContain('Crear publicación');
    });

    it('[O] la barra de arriba también abre la ventana', async () => {
      (fixture.nativeElement.querySelector('.compartir-hoy') as HTMLButtonElement).click();
      await actualizar();

      expect(ventana()).not.toBeNull();
    });

    it('[O] al pulsar + se abre la ventana con el formulario', async () => {
      boton().click();
      await actualizar();

      expect(ventana()).not.toBeNull();
      expect(ventana().textContent).toContain('Nueva publicación');
      expect(ventana().querySelector('form')).not.toBeNull();
    });

    it('[O] al publicar, la ventana se cierra y la publicación aparece', async () => {
      boton().click();
      await actualizar();
      fixture.componentInstance.formulario.patchValue({
        titulo: 'Hola',
        mensaje: 'Primer mensaje',
      });

      ventana().querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      http.expectOne({ method: 'POST', url: URL }).flush({ ...publicacion(99), titulo: 'Hola' });
      await actualizar();

      expect(ventana()).toBeNull();
      expect(texto()).toContain('Hola');
    });

    it('[E] si la API rechaza, la ventana sigue abierta con lo escrito', async () => {
      boton().click();
      await actualizar();
      fixture.componentInstance.formulario.patchValue({
        titulo: 'Hola',
        mensaje: 'Primer mensaje',
      });

      ventana().querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush({ codigo: 'DATOS_INVALIDOS' }, { status: 400, statusText: 'Bad Request' });
      await actualizar();

      expect(ventana()).not.toBeNull();
      expect(fixture.componentInstance.formulario.getRawValue().titulo).toBe('Hola');
      expect(fixture.nativeElement.querySelector('app-modal')).not.toBeNull();
    });

    it('[I] la X cierra la ventana y descarta lo escrito', async () => {
      boton().click();
      await actualizar();
      fixture.componentInstance.formulario.patchValue({
        titulo: 'Hola',
        mensaje: 'Primer mensaje',
      });

      ventana().querySelector('.ventana-cabecera button').click();
      await actualizar();

      expect(ventana()).toBeNull();
      expect(fixture.componentInstance.formulario.getRawValue()).toEqual({
        titulo: '',
        mensaje: '',
        ingredientes: '',
        pasos: '',
      });
    });

    it('[I] Escape cierra la ventana', async () => {
      boton().click();
      await actualizar();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await actualizar();

      expect(ventana()).toBeNull();
    });

    it('[B] hacer clic afuera de la ventana no la cierra, para no perder lo escrito', async () => {
      boton().click();
      await actualizar();

      fixture.nativeElement.querySelector('.velo').click();
      await actualizar();

      expect(ventana()).not.toBeNull();
    });
  });

  describe('publicar', () => {
    const formularioValido = { titulo: 'Hola', mensaje: 'Primer mensaje' };

    const enviar = async () => {
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };

    beforeEach(async () => {
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();
      fixture.componentInstance.abrirVentana();
      await actualizar();
    });

    it('[Z] con el formulario vacío no envía nada y marca los campos', async () => {
      await enviar();

      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.mensajeDeError('titulo')).toBe('Este campo es obligatorio');
      expect(fixture.componentInstance.mensajeDeError('mensaje')).toBe('Este campo es obligatorio');
    });

    it('[O] publica y la nueva aparece primera en la lista', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      http.expectOne({ method: 'POST', url: URL }).flush({ ...publicacion(99), titulo: 'Hola' });
      await actualizar();

      const tarjetas = fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion');
      expect(tarjetas).toHaveLength(2);
      expect(tarjetas[0].textContent).toContain('Hola');
    });

    it('[O] después de publicar el formulario queda vacío', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      http.expectOne({ method: 'POST', url: URL }).flush(publicacion(99));

      expect(fixture.componentInstance.formulario.getRawValue()).toEqual({
        titulo: '',
        mensaje: '',
        ingredientes: '',
        pasos: '',
      });
    });

    it('[I] envía título y mensaje sin espacios alrededor, y la imagen si hay', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: '  Hola ', mensaje: ' Mundo  ' });
      fixture.componentInstance.imagen.set(new File(['x'], 'foto.png', { type: 'image/png' }));

      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('titulo')).toBe('Hola');
      expect(cuerpo.get('mensaje')).toBe('Mundo');
      expect((cuerpo.get('imagen') as File).name).toBe('foto.png');
    });

    it('[I] envía el tipo receta por defecto', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('tipo')).toBe('receta');
    });

    it('[I] envía el tipo que se eligió', async () => {
      fixture.componentInstance.tipo.set('experiencia');
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('tipo')).toBe('experiencia');
    });

    it('[I] con receta o completa envía ingredientes y pasos si hay', async () => {
      fixture.componentInstance.formulario.patchValue({
        ...formularioValido,
        ingredientes: ' Pan\nManteca ',
        pasos: 'Tostar',
      });
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('ingredientes')).toBe('Pan\nManteca');
      expect(cuerpo.get('pasos')).toBe('Tostar');
    });

    it('[I] con tip o experiencia no envía ingredientes ni pasos', async () => {
      fixture.componentInstance.tipo.set('tip');
      fixture.componentInstance.formulario.patchValue({
        ...formularioValido,
        ingredientes: 'Pan',
        pasos: 'Tostar',
      });
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.has('ingredientes')).toBe(false);
      expect(cuerpo.has('pasos')).toBe(false);
    });

    it('[I] los campos de ingredientes y pasos sólo aparecen en receta y completa', async () => {
      const campos = () => fixture.nativeElement.querySelectorAll('textarea').length;
      expect(campos()).toBe(3);

      fixture.componentInstance.tipo.set('tip');
      await actualizar();
      expect(campos()).toBe(1);

      fixture.componentInstance.tipo.set('completa');
      await actualizar();
      expect(campos()).toBe(3);
    });

    it('[B] un título de 55 caracteres envía y uno de 56 no', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'a'.repeat(56), mensaje: 'x' });
      await enviar();
      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.mensajeDeError('titulo')).toContain('55');

      fixture.componentInstance.formulario.patchValue({ titulo: 'a'.repeat(55), mensaje: 'x' });
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[B] un mensaje de 2000 caracteres envía y uno de 2001 no', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'x', mensaje: 'a'.repeat(2001) });
      await enviar();
      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.mensajeDeError('mensaje')).toContain('2000');

      fixture.componentInstance.formulario.patchValue({ titulo: 'x', mensaje: 'a'.repeat(2000) });
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[E] una imagen inválida muestra el error y bloquea el envío', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      fixture.componentInstance.elegirImagen({
        target: { files: [new File(['x'], 'nota.pdf', { type: 'application/pdf' })] },
      } as unknown as Event);

      await enviar();

      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.errorImagen()).toBe('imagen.tipo');
    });

    it('[E] si la API rechaza la publicación avisa y conserva lo escrito', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush(
          { message: ['titulo should not be empty'] },
          { status: 400, statusText: 'Bad Request' },
        );
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-modal')).not.toBeNull();
      expect(fixture.componentInstance.formulario.getRawValue().titulo).toBe('Hola');
      expect(fixture.componentInstance.publicando()).toBe(false);
    });

    it('[S] mientras espera la respuesta no publica dos veces', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      await enviar();

      http.expectOne({ method: 'POST', url: URL });
    });
  });
});
