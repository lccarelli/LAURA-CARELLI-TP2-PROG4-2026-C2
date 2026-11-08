import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Publicacion } from '../../interfaces/publicacion';
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
  fecha: '2026-10-22T15:30:00.000Z',
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
  let eliminadas: string[];

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
    eliminadas = [];
    fixture.componentInstance.eliminada.subscribe((id) => eliminadas.push(id));
    fixture.componentRef.setInput('publicacion', publicacion);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

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

    expect(etiquetas).toEqual(['Dar me gusta (7)', '2 comentarios']);
  });

  it('[Z] sin imagen en la publicación muestra el mensaje en un recuadro', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('.pin-imagen')).toBeNull();
    expect(elemento.querySelector('.pin-texto')!.textContent).toContain('Mi mensaje');
    expect(elemento.querySelectorAll('img')).toHaveLength(1);
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
      fixture.nativeElement.querySelector('.boton-metrica.metrica') as HTMLButtonElement;
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
      fixture.componentInstance['alternarMeGusta']();
      await actualizar();

      http.expectOne({ method: 'POST', url: `${URL}/1/megusta` }).flush({
        meGusta: true,
        cantidadMeGusta: 8,
      });
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

  describe('eliminar', () => {
    const botonEliminar = () =>
      fixture.nativeElement.querySelector('.boton-eliminar') as HTMLButtonElement | null;
    const botonDeConfirmacion = (texto: string) =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '.pin-confirmar button',
        ) as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent!.includes(texto))!;
    const actualizar = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const iniciarSesion = (usuario: Usuario | null) => TestBed.inject(Auth).usuario.set(usuario);

    it('[O] la dueña ve el botón de eliminar', async () => {
      await crear(base);
      iniciarSesion(persona('u1'));
      await actualizar();

      expect(botonEliminar()).not.toBeNull();
      expect(botonEliminar()!.getAttribute('aria-label')).toBe('Eliminar publicación');
    });

    it('[O] una persona con perfil administrador ve el botón en publicaciones ajenas', async () => {
      await crear(base);
      iniciarSesion(persona('otra', 'administrador'));
      await actualizar();

      expect(botonEliminar()).not.toBeNull();
    });

    it('[E] una persona común no lo ve en publicaciones ajenas', async () => {
      await crear(base);
      iniciarSesion(persona('otra'));
      await actualizar();

      expect(botonEliminar()).toBeNull();
    });

    it('[E] sin sesión tampoco', async () => {
      await crear(base);
      iniciarSesion(null);
      await actualizar();

      expect(botonEliminar()).toBeNull();
    });

    it('[O] tocar eliminar pide confirmación dentro de la tarjeta y todavía no manda nada', async () => {
      await crear(base);
      iniciarSesion(persona('u1'));
      await actualizar();

      botonEliminar()!.click();
      await actualizar();

      const confirmar = fixture.nativeElement.querySelector('.pin-confirmar') as HTMLElement;
      expect(confirmar.textContent).toContain('¿Eliminar esta publicación?');
      expect(confirmar.getAttribute('role')).toBe('group');
      expect(fixture.nativeElement.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
      http.verify();
    });

    it('[O] cancelar cierra la confirmación sin pedir nada', async () => {
      await crear(base);
      iniciarSesion(persona('u1'));
      await actualizar();
      botonEliminar()!.click();
      await actualizar();

      botonDeConfirmacion('Cancelar').click();
      await actualizar();

      expect(fixture.nativeElement.querySelector('.pin-confirmar')).toBeNull();
      expect(botonEliminar()).not.toBeNull();
      http.verify();
    });

    it('[O] confirmar pide DELETE, se bloquea y al terminar avisa cuál se eliminó', async () => {
      await crear(base);
      iniciarSesion(persona('u1'));
      await actualizar();
      botonEliminar()!.click();
      await actualizar();

      botonDeConfirmacion('Sí, eliminar').click();
      await actualizar();
      const pedido = http.expectOne({ method: 'DELETE', url: `${URL}/1` });
      expect(botonDeConfirmacion('Eliminando').disabled).toBe(true);
      expect(eliminadas).toEqual([]);

      pedido.flush(null, { status: 204, statusText: 'No Content' });

      expect(eliminadas).toEqual(['1']);
    });

    it('[E] si no te deja (403), cierra la confirmación, muestra el motivo y no avisa que se eliminó', async () => {
      await crear(base);
      iniciarSesion(persona('u1'));
      await actualizar();
      botonEliminar()!.click();
      await actualizar();

      botonDeConfirmacion('Sí, eliminar').click();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/1` })
        .flush({ codigo: 'PUBLICACION_AJENA' }, { status: 403, statusText: 'Forbidden' });
      await actualizar();

      expect(fixture.nativeElement.querySelector('.pin-confirmar')).toBeNull();
      expect(fixture.nativeElement.querySelector('.pin-error')!.textContent).toContain(
        'Sólo podés eliminar tus propias publicaciones',
      );
      expect(eliminadas).toEqual([]);
    });
  });
});
