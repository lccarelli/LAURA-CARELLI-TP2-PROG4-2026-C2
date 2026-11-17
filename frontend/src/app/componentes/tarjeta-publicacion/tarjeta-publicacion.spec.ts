import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Publicacion } from '../../interfaces/publicacion';
import { By } from '@angular/platform-browser';
import { BotonMeGusta } from '../boton-me-gusta/boton-me-gusta';
import { ModalCompartir } from '../modal-compartir/modal-compartir';
import { TarjetaPublicacion } from './tarjeta-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const base: Publicacion = {
  _id: '1',
  usuario: {
    _id: 'u1',
    nombre: 'Laura',
    apellido: 'Carelli',
    nombreUsuario: 'laura_c',
  },
  tipo: 'tip',
  cantidadMeGusta: 7,
  cantidadComentarios: 2,
  titulo: 'Mi título',
  mensaje: 'Mi mensaje',
  fecha: '2026-10-22T15:30:00',
};

const URL = `${environment.API_URL}/publicaciones`;

const persona = (id: string, perfil: Usuario['perfil'] = 'usuario'): Usuario => ({
  _id: id,
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: '',
  perfil,
  habilitado: true,
});

describe('TarjetaPublicacion', () => {
  let fixture: ComponentFixture<TarjetaPublicacion>;
  let http: HttpTestingController;

  async function crear(publicacion: Publicacion) {
    await TestBed.configureTestingModule({
      imports: [TarjetaPublicacion],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TarjetaPublicacion);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('publicacion', publicacion);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => vi.useRealTimers());

  it('[O] muestra cuánto hace que se publicó, en el idioma elegido', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T15:30:00'));

    const tarjeta = await crear(base);

    expect(tarjeta.querySelector('.pin-fecha')?.textContent).toBe('hace 3 días');
  });

  it.each([
    ['receta', 'var(--tema-torta-1)'],
    ['tip', 'var(--tema-torta-2)'],
    ['experiencia', 'var(--tema-torta-3)'],
  ] as const)('[O] al pasar el mouse resalta con el color de %s', async (tipo, color) => {
    await crear({ ...base, tipo });
    const tarjeta = fixture.nativeElement as HTMLElement;

    tarjeta.dispatchEvent(new Event('mouseenter'));
    await fixture.whenStable();

    expect(tarjeta.classList).toContain('resaltado');
    expect(tarjeta.style.getPropertyValue('--color-resaltado')).toBe(color);
  });

  it('[S] al sacar el mouse deja de estar resaltada', async () => {
    await crear(base);
    const tarjeta = fixture.nativeElement as HTMLElement;

    tarjeta.dispatchEvent(new Event('mouseenter'));
    tarjeta.dispatchEvent(new Event('mouseleave'));
    await fixture.whenStable();

    expect(tarjeta.classList).not.toContain('resaltado');
  });

  it('[O] muestra el título y el autor', async () => {
    const texto = (await crear(base)).textContent;

    expect(texto).toContain('Mi título');
    expect(texto).toContain('@laura_c');
  });

  it('[O] muestra la cantidad de me gusta y de comentarios', async () => {
    const elemento = await crear(base);
    const etiquetas = Array.from(elemento.querySelectorAll('.metrica')).map((m) =>
      m.getAttribute('aria-label'),
    );

    expect(etiquetas).toEqual(['Guardar', 'Compartir', 'Dar me gusta (7)', '2 comentarios']);
  });

  it('[O] el botón Compartir abre la ventana para elegir personas', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('app-modal-compartir')).toBeNull();
    (elemento.querySelector('[aria-label="Compartir"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento.querySelector('app-modal-compartir [role="dialog"]')).not.toBeNull();
  });

  it('[S] al compartir cierra la ventana y avisa con cuántas personas se compartió', async () => {
    const elemento = await crear(base);
    (elemento.querySelector('[aria-label="Compartir"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const modal = fixture.debugElement.query(By.directive(ModalCompartir))
      .componentInstance as ModalCompartir;

    modal.compartida.emit(2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento.querySelector('app-modal-compartir')).toBeNull();
    expect(elemento.querySelector('[role="status"]')!.textContent).toContain('Compartida con 2');
  });

  it('[S] cancelar la ventana la cierra sin avisar nada', async () => {
    const elemento = await crear(base);
    (elemento.querySelector('[aria-label="Compartir"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const modal = fixture.debugElement.query(By.directive(ModalCompartir))
      .componentInstance as ModalCompartir;

    modal.cancelado.emit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento.querySelector('app-modal-compartir')).toBeNull();
    expect(elemento.querySelector('[role="status"]')).toBeNull();
  });

  it('[Z] sin imagen en la publicación muestra el mensaje en un recuadro', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('.pin-imagen')).toBeNull();
    expect(elemento.querySelector('.pin-texto')!.textContent).toContain('Mi mensaje');
    expect(elemento.querySelectorAll('img')).toHaveLength(1);
  });

  it('[O] un mensaje largo sin imagen se corta con puntos suspensivos', async () => {
    const mensaje = `${'Crocantes por fuera y blandas por dentro. '.repeat(6)}fin`;

    const texto = (await crear({ ...base, mensaje })).querySelector('.pin-texto')!.textContent!;

    expect(texto.endsWith('…')).toBe(true);
    expect(Array.from(texto).length).toBeLessThanOrEqual(140);
  });

  it('[B] un mensaje de hasta 140 letras se ve entero', async () => {
    const mensaje = 'a'.repeat(140);

    const texto = (await crear({ ...base, mensaje })).querySelector('.pin-texto')!.textContent;

    expect(texto).toBe(mensaje);
  });

  it('[Z] un autor sin foto muestra la imagen por defecto', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('img')!.getAttribute('src')).toBe('/sin-foto.svg');
  });

  it('[M] con imagen la muestra en lugar del mensaje, junto a la foto del autor', async () => {
    const elemento = await crear({
      ...base,
      imagen: 'https://res.cloudinary.com/nube/image/upload/banquete/aaa.png',
      usuario: {
        ...base.usuario,
        imagenPerfil: 'https://res.cloudinary.com/nube/image/upload/banquete/bbb.png',
      },
    });
    const fuentes = Array.from(elemento.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );

    expect(fuentes).toEqual([
      'https://res.cloudinary.com/nube/image/upload/banquete/aaa.png',
      'https://res.cloudinary.com/nube/image/upload/banquete/bbb.png',
    ]);
    expect(elemento.querySelector('.pin-texto')).toBeNull();
  });

  it('[I] es un enlace a la página de la publicación', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('a.pin')!.getAttribute('href')).toBe('/publicaciones/1');
  });

  describe('me gusta', () => {
    const botonMeGusta = () =>
      fixture.nativeElement.querySelector('app-boton-me-gusta button') as HTMLButtonElement;
    const actualizar = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const contador = () => botonMeGusta().textContent!.trim();

    it('[O] sin haberlo dado, el botón ofrece dar me gusta y no está marcado', async () => {
      await crear(base);

      expect(botonMeGusta().getAttribute('aria-label')).toBe('Dar me gusta (7)');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('false');
      expect(botonMeGusta().classList.contains('activa')).toBe(false);
    });

    it('[O] si ya lo di, el botón ofrece quitarlo y está marcado', async () => {
      await crear({ ...base, meGusta: true });

      expect(botonMeGusta().getAttribute('aria-label')).toBe('Quitar me gusta (7)');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('true');
      expect(botonMeGusta().classList.contains('activa')).toBe(true);
    });

    it('[O] dar me gusta pide POST, se bloquea mientras espera y muestra la cantidad nueva', async () => {
      await crear(base);

      botonMeGusta().click();
      await actualizar();
      const pedido = http.expectOne({ method: 'POST', url: `${URL}/1/megusta` });
      expect(botonMeGusta().disabled).toBe(true);

      pedido.flush({ meGusta: true, cantidadMeGusta: 8 });
      await actualizar();

      expect(botonMeGusta().disabled).toBe(false);
      expect(contador()).toBe('8');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('true');
    });

    it('[B] un segundo clic mientras espera no manda otro pedido', async () => {
      await crear(base);

      botonMeGusta().click();
      fixture.debugElement.query(By.directive(BotonMeGusta)).componentInstance['alternar']();
      await actualizar();

      const pedidos = http.match({ method: 'POST', url: `${URL}/1/megusta` });
      expect(pedidos).toHaveLength(1);
      pedidos[0].flush({ meGusta: true, cantidadMeGusta: 8 });
      http.verify();
    });

    it('[O] quitar me gusta pide DELETE y resta uno', async () => {
      await crear({ ...base, meGusta: true });

      botonMeGusta().click();
      http.expectOne({ method: 'DELETE', url: `${URL}/1/megusta` }).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      await actualizar();

      expect(contador()).toBe('6');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('false');
    });

    it('[B] al quitar con la cantidad en cero no baja de cero', async () => {
      await crear({ ...base, meGusta: true, cantidadMeGusta: 0 });

      botonMeGusta().click();
      http.expectOne({ method: 'DELETE', url: `${URL}/1/megusta` }).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      await actualizar();

      expect(contador()).toBe('0');
    });

    it('[E] si el servidor dice que ya lo había dado (409), queda marcado y no muestra error', async () => {
      await crear(base);

      botonMeGusta().click();
      http
        .expectOne({ method: 'POST', url: `${URL}/1/megusta` })
        .flush({ codigo: 'ME_GUSTA_REPETIDO' }, { status: 409, statusText: 'Conflict' });
      await actualizar();

      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('true');
      expect(fixture.nativeElement.querySelector('.pin-error')).toBeNull();
    });

    it('[E] si el servidor dice que no lo había dado (404), queda sin marcar y no muestra error', async () => {
      await crear({ ...base, meGusta: true });

      botonMeGusta().click();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/1/megusta` })
        .flush({ codigo: 'ME_GUSTA_INEXISTENTE' }, { status: 404, statusText: 'Not Found' });
      await actualizar();

      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('false');
      expect(fixture.nativeElement.querySelector('.pin-error')).toBeNull();
    });

    it('[E] un error del servidor muestra el aviso, deja todo como estaba y se puede reintentar', async () => {
      await crear(base);

      botonMeGusta().click();
      http
        .expectOne({ method: 'POST', url: `${URL}/1/megusta` })
        .flush({ codigo: 'PUBLICACION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
      await actualizar();

      expect(fixture.nativeElement.querySelector('.pin-error')!.textContent).toContain(
        'La publicación no existe',
      );
      expect(contador()).toBe('7');
      expect(botonMeGusta().disabled).toBe(false);
    });

    it('[E] un corte de red muestra el aviso de conexión', async () => {
      await crear(base);

      botonMeGusta().click();
      http.expectOne({ method: 'POST', url: `${URL}/1/megusta` }).error(new ProgressEvent('error'));
      await actualizar();

      expect(fixture.nativeElement.querySelector('.pin-error')).not.toBeNull();
    });

    it('[I] si el listado entrega otra publicación a la misma tarjeta, vuelve a sus datos', async () => {
      await crear(base);
      botonMeGusta().click();
      http.expectOne({ method: 'POST', url: `${URL}/1/megusta` }).flush({
        meGusta: true,
        cantidadMeGusta: 8,
      });

      fixture.componentRef.setInput('publicacion', { ...base, _id: '2', cantidadMeGusta: 3 });
      await actualizar();

      expect(contador()).toBe('3');
      expect(botonMeGusta().getAttribute('aria-pressed')).toBe('false');
    });

    it('[I] los botones no están dentro del enlace de la publicación', async () => {
      const elemento = await crear(base);

      expect(elemento.querySelector('a.pin button')).toBeNull();
      expect(elemento.querySelectorAll('button').length).toBeGreaterThan(0);
    });
  });

  describe('autoría', () => {
    it('[O] con sesión, el nombre de quien publicó lleva a su perfil', async () => {
      const elemento = await crear({ ...base, usuario: { ...base.usuario, _id: 'u9' } });

      const enlace = elemento.querySelector('a.pin-autor') as HTMLAnchorElement;

      expect(enlace.getAttribute('href')).toBe('/perfil/u9');
      expect(enlace.textContent).toContain('@laura_c');
    });

    it('[I] no hay enlaces anidados: el de la autoría no está dentro del de la publicación', async () => {
      const elemento = await crear(base);

      expect(elemento.querySelectorAll('a a')).toHaveLength(0);
      expect(elemento.querySelector('a.pin')!.textContent!.trim()).toBe('');
      expect(elemento.querySelector('a.pin')!.getAttribute('aria-label')).toBe('Mi título');
    });

    it('[I] la tarjeta entera sigue llevando a la publicación', async () => {
      const elemento = await crear(base);

      expect(elemento.querySelector('a.pin')!.getAttribute('href')).toBe(
        `/publicaciones/${base._id}`,
      );
    });

    it('[Z] en la vista pública la autoría es texto, sin enlace', async () => {
      const elemento = await crear(base);
      fixture.componentRef.setInput('soloLectura', true);
      await fixture.whenStable();

      expect(elemento.querySelector('a.pin-autor')).toBeNull();
      expect(elemento.querySelector('span.pin-autor')!.textContent).toContain('@laura_c');
    });
  });

  describe('sólo lectura', () => {
    it('[O] abre la vista pública y no la del detalle con sesión', async () => {
      await crear(base);
      fixture.componentRef.setInput('soloLectura', true);
      await fixture.whenStable();

      const enlace = fixture.nativeElement.querySelector('a.pin') as HTMLAnchorElement;

      expect(enlace.getAttribute('href')).toBe(`/publico/${base._id}`);
    });

    it('[I] muestra los números pero no hay ningún botón: ni me gusta, ni guardar, ni eliminar', async () => {
      const elemento = await crear(base);
      fixture.componentRef.setInput('soloLectura', true);
      await fixture.whenStable();

      expect(elemento.querySelectorAll('button')).toHaveLength(0);
      const etiquetas = Array.from(elemento.querySelectorAll('.metrica')).map((m) =>
        m.getAttribute('aria-label'),
      );
      expect(etiquetas).toEqual(['7 me gusta', '2 comentarios']);
    });

    it('[S] aunque la persona sea quien publicó no ofrece eliminar', async () => {
      const elemento = await crear({ ...base, usuario: { ...base.usuario, _id: 'u1' } });
      TestBed.inject(Auth).usuario.set(persona('u1'));
      fixture.componentRef.setInput('soloLectura', true);
      await fixture.whenStable();

      expect(elemento.querySelector('.boton-eliminar')).toBeNull();
      expect(elemento.querySelectorAll('button')).toHaveLength(0);
    });
  });

  describe('guardar', () => {
    const botonGuardar = () =>
      fixture.nativeElement.querySelector('app-boton-guardar button') as HTMLButtonElement;

    it('[Z] una publicación sin guardar ofrece guardarla', async () => {
      await crear(base);

      expect(botonGuardar().getAttribute('aria-pressed')).toBe('false');
    });

    it('[I] una ya guardada llega marcada', async () => {
      await crear({ ...base, guardada: true });

      expect(botonGuardar().getAttribute('aria-pressed')).toBe('true');
    });

    it('[O] guardar manda el pedido y no avisa que se quitó', async () => {
      await crear(base);
      const quitadas: string[] = [];
      fixture.componentInstance.desguardada.subscribe((id) => quitadas.push(id));

      botonGuardar().click();
      http
        .expectOne({ method: 'POST', url: `${URL}/${base._id}/guardar` })
        .flush({ guardada: true, cantidadGuardados: 1 });
      await fixture.whenStable();

      expect(quitadas).toEqual([]);
    });

    it('[S] quitar de guardadas avisa con el id para que el listado la saque', async () => {
      await crear({ ...base, guardada: true });
      const quitadas: string[] = [];
      fixture.componentInstance.desguardada.subscribe((id) => quitadas.push(id));

      botonGuardar().click();
      http
        .expectOne({ method: 'POST', url: `${URL}/${base._id}/quitar-guardado` })
        .flush({ guardada: false, cantidadGuardados: 0 });
      await fixture.whenStable();

      expect(quitadas).toEqual([base._id]);
    });
  });

  describe('acciones de la vista resumida', () => {
    const iniciarSesion = (usuario: Usuario | null) => TestBed.inject(Auth).usuario.set(usuario);

    it.each([
      ['quien publicó', persona('u1')],
      ['un administrador', persona('otra', 'administrador')],
      ['otra persona', persona('otra')],
    ])(
      '[I] para %s no hay botón de eliminar: eso se hace desde el detalle',
      async (_quien, sesion) => {
        const elemento = await crear(base);
        iniciarSesion(sesion);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(elemento.querySelector('.boton-eliminar')).toBeNull();
        expect(elemento.querySelector('.pin-confirmar')).toBeNull();
        expect(elemento.querySelector('[aria-label="Eliminar publicación"]')).toBeNull();
      },
    );

    it('[I] a la izquierda guardar y compartir; a la derecha, juntos, el corazón y la cantidad de comentarios', async () => {
      const elemento = await crear(base);

      const orden = Array.from(elemento.querySelectorAll('.pin-acciones .metrica')).map((m) =>
        m.getAttribute('aria-label'),
      );

      expect(orden).toEqual(['Guardar', 'Compartir', 'Dar me gusta (7)', '2 comentarios']);
    });

    it('[I] el corazón abre el grupo de la derecha y los comentarios lo cierran, sin nada en el medio', async () => {
      const elemento = await crear(base);

      const hijos = Array.from(elemento.querySelectorAll('.pin-acciones > *'));
      const corazon = elemento.querySelector('.pin-acciones > app-boton-me-gusta')!;

      expect(corazon.classList).toContain('pin-derecha');
      expect(hijos.at(-2)).toBe(corazon);
      expect(hijos.at(-1)!.classList).toContain('metrica-comentarios');
    });

    it('[I] los únicos botones son me gusta, guardar y compartir, en ese orden y juntos', async () => {
      const elemento = await crear(base);

      const botones = Array.from(elemento.querySelectorAll('.pin-acciones button')).map((boton) =>
        boton.getAttribute('aria-label'),
      );

      expect(botones).toEqual(['Guardar', 'Compartir', 'Dar me gusta (7)']);
      expect(
        elemento.querySelectorAll('.pin-acciones > *, .pin-acciones app-boton-guardar > *'),
      ).not.toHaveLength(0);
    });
  });
});
