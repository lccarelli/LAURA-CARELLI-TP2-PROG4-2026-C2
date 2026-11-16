import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Notificacion, PaginaNotificaciones } from '../../interfaces/notificacion';
import { Auth } from '../../servicios/auth/auth';
import { Campanita } from './campanita';

const URL = `${environment.API_URL}/notificaciones`;

const notificacion = (numero: number, cambios: Partial<Notificacion> = {}): Notificacion => ({
  _id: `n${numero}`,
  tipo: 'comentario',
  leida: false,
  fecha: new Date().toISOString(),
  publicacion: { _id: `p${numero}`, titulo: `Receta ${numero}` },
  actor: { _id: 'u2', nombreUsuario: 'juan_p' },
  ...cambios,
});

const pagina = (datos: Notificacion[], hayMas = false): PaginaNotificaciones => ({
  datos,
  offset: 0,
  limit: 10,
  hayMas,
});

describe('Campanita', () => {
  let fixture: ComponentFixture<Campanita>;
  let http: HttpTestingController;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const texto = () => fixture.nativeElement.textContent as string;
  const sinLeer = (cantidad: number) => http.expectOne(`${URL}/sin-leer`).flush({ cantidad });
  const abrirPanel = async (datos: Notificacion[], hayMas = false) => {
    const pendientes = Number(el('.campanita-aviso')?.textContent ?? 0);
    (el('.boton-campanita') as HTMLButtonElement).click();
    await actualizar();
    http
      .expectOne((s) => s.url === URL && s.params.get('offset') === '0')
      .flush(pagina(datos, hayMas));
    http.match(`${URL}/sin-leer`).forEach((s) => s.flush({ cantidad: pendientes }));
    await actualizar();
  };
  const iniciarSesion = async (cantidad = 2) => {
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
    await actualizar();
    sinLeer(cantidad);
    await actualizar();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Campanita],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([{ path: 'publicaciones/:id', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Campanita);
  });

  it('[Z] sin sesión no muestra la campanita ni pregunta nada', async () => {
    await actualizar();

    expect(el('.boton-campanita')).toBeNull();
    expect(http.match(() => true)).toEqual([]);
  });

  it('[O] con sesión pregunta cuántas hay sin leer y las muestra en la insignia', async () => {
    await iniciarSesion(3);

    expect(el('.campanita-aviso').textContent!.trim()).toBe('3');
    expect(el('.boton-campanita').getAttribute('aria-label')).toBe('Notificaciones, 3 sin leer');
  });

  it('[B] sin pendientes no hay insignia y el nombre accesible es sólo Notificaciones', async () => {
    await iniciarSesion(0);

    expect(el('.campanita-aviso')).toBeNull();
    expect(el('.boton-campanita').getAttribute('aria-label')).toBe('Notificaciones');
  });

  it('[B] con más de 99 muestra 99+', async () => {
    await iniciarSesion(250);

    expect(el('.campanita-aviso').textContent!.trim()).toBe('99+');
  });

  it('[S] al volver a la pestaña vuelve a preguntar', async () => {
    await iniciarSesion(1);

    document.dispatchEvent(new Event('visibilitychange'));
    sinLeer(4);
    await actualizar();

    expect(el('.campanita-aviso').textContent!.trim()).toBe('4');
  });

  it('[S] al cerrar la sesión se borra la insignia', async () => {
    await iniciarSesion(2);

    TestBed.inject(Auth).usuario.set(null);
    await actualizar();

    expect(el('.boton-campanita')).toBeNull();
  });

  describe('panel', () => {
    it('[O] al abrirlo pide la primera página y cuenta qué pasó en cada aviso', async () => {
      await iniciarSesion(2);

      await abrirPanel([notificacion(1), notificacion(2, { tipo: 'me_gusta' })]);

      expect(el('.boton-campanita').getAttribute('aria-expanded')).toBe('true');
      expect(texto()).toContain('juan_p comentó en «Receta 1»');
      expect(texto()).toContain('A juan_p le gustó «Receta 2»');
    });

    it('[I] cada aviso lleva a su publicación y los no leídos se distinguen', async () => {
      await iniciarSesion(1);
      await abrirPanel([notificacion(1), notificacion(2, { leida: true, tipo: 'me_gusta' })]);

      const enlaces = fixture.nativeElement.querySelectorAll(
        '.notificacion',
      ) as NodeListOf<HTMLAnchorElement>;

      expect(enlaces[0].getAttribute('href')).toBe('/publicaciones/p1#comentarios');
      expect(enlaces[1].getAttribute('href')).toBe('/publicaciones/p2');
      expect(enlaces[0].classList).toContain('sin-leer');
      expect(enlaces[1].classList).not.toContain('sin-leer');
    });

    it('[S] tocar un aviso de comentario navega a los comentarios de esa publicación', async () => {
      await iniciarSesion(1);
      await abrirPanel([notificacion(1)]);
      const router = TestBed.inject(Router);

      (el('.notificacion') as HTMLAnchorElement).click();
      await actualizar();

      expect(router.url).toBe('/publicaciones/p1#comentarios');
    });

    it('[S] tocar un aviso de me gusta navega a la publicación', async () => {
      await iniciarSesion(1);
      await abrirPanel([notificacion(2, { tipo: 'me_gusta' })]);
      const router = TestBed.inject(Router);

      (el('.notificacion') as HTMLAnchorElement).click();
      await actualizar();

      expect(router.url).toBe('/publicaciones/p2');
    });

    it('[Z] sin avisos dice que todavía no hay', async () => {
      await iniciarSesion(0);

      await abrirPanel([]);

      expect(texto()).toContain('Todavía no tenés notificaciones');
    });

    it('[S] ver más pide la página siguiente', async () => {
      await iniciarSesion(1);
      await abrirPanel([notificacion(1)], true);

      fixture.componentInstance.listado.cargarMas();

      const siguiente = http.expectOne((s) => s.url === URL && s.params.get('offset') === '1');
      expect(siguiente.request.params.get('limit')).toBe('10');
      siguiente.flush(pagina([]));
    });

    it('[S] se cierra con Escape, con la cruz y tocando afuera', async () => {
      await iniciarSesion(1);
      for (const cerrar of [
        () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
        () => (el('.notificaciones-cabecera button') as HTMLButtonElement).click(),
        () => el('.notificaciones-fondo').click(),
      ]) {
        await abrirPanel([notificacion(1)]);

        cerrar();
        await actualizar();

        expect(el('.notificaciones-panel')).toBeNull();
      }
    });
  });

  describe('lectura', () => {
    it('[S] tocar un aviso sin leer lo marca como leído y baja el contador', async () => {
      await iniciarSesion(2);
      await abrirPanel([notificacion(1), notificacion(2)]);

      (el('.notificacion') as HTMLAnchorElement).click();
      await actualizar();

      http
        .expectOne({ method: 'POST', url: `${URL}/n1/leer` })
        .flush(notificacion(1, { leida: true }));
      await actualizar();
      expect(el('.campanita-aviso').textContent!.trim()).toBe('1');
      expect(el('.notificaciones-panel')).toBeNull();
    });

    it('[B] tocar uno ya leído no pide nada ni cambia el contador', async () => {
      await iniciarSesion(1);
      await abrirPanel([notificacion(1, { leida: true }), notificacion(2)]);

      (el('.notificacion') as HTMLAnchorElement).click();
      await actualizar();

      expect(http.match({ method: 'POST' })).toEqual([]);
      expect(el('.campanita-aviso').textContent!.trim()).toBe('1');
    });

    it('[E] si no se pudo marcar como leído, vuelve a preguntar el contador real', async () => {
      await iniciarSesion(1);
      await abrirPanel([notificacion(1)]);

      (el('.notificacion') as HTMLAnchorElement).click();
      http
        .expectOne({ method: 'POST', url: `${URL}/n1/leer` })
        .flush({}, { status: 500, statusText: 'Error' });
      await actualizar();
      sinLeer(1);
      await actualizar();

      expect(el('.campanita-aviso').textContent!.trim()).toBe('1');
    });

    it('[S] marcar todas como leídas deja el contador en cero y los avisos leídos', async () => {
      await iniciarSesion(2);
      await abrirPanel([notificacion(1), notificacion(2)]);

      (el('.notificaciones-marcar') as HTMLButtonElement).click();
      http.expectOne({ method: 'POST', url: `${URL}/leer-todas` }).flush({ actualizadas: 2 });
      await actualizar();

      expect(el('.campanita-aviso')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.notificacion.sin-leer')).toHaveLength(0);
      expect(el('.notificaciones-marcar')).toBeNull();
    });

    it('[E] sin pendientes no ofrece marcar todas', async () => {
      await iniciarSesion(0);

      await abrirPanel([notificacion(1, { leida: true })]);

      expect(el('.notificaciones-marcar')).toBeNull();
    });
  });
});
