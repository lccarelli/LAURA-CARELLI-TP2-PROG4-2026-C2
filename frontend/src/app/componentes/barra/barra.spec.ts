import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '../../servicios/auth/auth';
import { Barra } from './barra';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

describe('Barra', () => {
  let fixture: ComponentFixture<Barra>;

  const iniciarSesion = async () => {
    TestBed.inject(Auth).usuario.set({ nombreUsuario: 'laura_c' } as never);
    TestBed.inject(Auth).token.set('abc');
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const texto = () => fixture.nativeElement.textContent as string;

  const botonSalir = () =>
    [...fixture.nativeElement.querySelectorAll('button')].find((boton) =>
      (boton as HTMLElement).textContent?.includes('Salir'),
    ) as HTMLButtonElement;

  const desplazarA = (posicion: number) => {
    Object.defineProperty(window, 'scrollY', { value: posicion, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  const barraInferior = () => fixture.nativeElement.querySelector('.barra-nav') as HTMLElement;

  afterEach(() => desplazarA(0));

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Barra],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([
          { path: 'perfil', children: [] },
          { path: 'perfil/publicaciones', children: [] },
          { path: 'perfil/editar', children: [] },
          { path: 'perfil/guardadas', children: [] },
          { path: 'publicaciones', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Barra);
    await fixture.whenStable();
  });

  it('[Z] sin sesión ofrece ingresar y registrarse, y no salir', () => {
    expect(texto()).toContain('Ingresar');
    expect(texto()).toContain('Registrarme');
    expect(texto()).not.toContain('Salir');
  });

  it('[O] con sesión muestra el usuario y el botón Salir', async () => {
    await iniciarSesion();

    expect(texto()).toContain('@laura_c');
    expect(texto()).toContain('Mi perfil');
    expect(texto()).toContain('Salir');
    expect(texto()).not.toContain('Registrarme');
  });

  it('[O] un administrador ve el enlace a Administración y lleva a los usuarios', async () => {
    TestBed.inject(Auth).usuario.set({
      nombreUsuario: 'laura_c',
      perfil: 'administrador',
    } as never);
    TestBed.inject(Auth).token.set('abc');
    fixture.detectChanges();
    await fixture.whenStable();

    const enlace = fixture.nativeElement.querySelector('a[href="/dashboard/usuarios"]');

    expect(enlace.textContent).toContain('Administración');
  });

  it('[E] una persona común no ve el enlace a Administración', async () => {
    TestBed.inject(Auth).usuario.set({ nombreUsuario: 'laura_c', perfil: 'usuario' } as never);
    TestBed.inject(Auth).token.set('abc');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('a[href="/dashboard/usuarios"]')).toBeNull();
    expect(texto()).not.toContain('Administración');
  });

  it('[Z] sin sesión tampoco aparece Administración', () => {
    expect(texto()).not.toContain('Administración');
  });

  it('[O] con sesión ofrece ir a Guardadas, con el ícono de marcador', async () => {
    await iniciarSesion();

    const enlace = fixture.nativeElement.querySelector(
      'a[href="/perfil/guardadas"]',
    ) as HTMLAnchorElement;

    expect(enlace.textContent).toContain('Guardadas');
    expect(enlace.getAttribute('title')).toBe('Guardadas');
    expect(enlace.querySelector('svg')).not.toBeNull();
  });

  it('[Z] sin sesión no hay enlace a Guardadas', () => {
    expect(fixture.nativeElement.querySelector('a[href="/perfil/guardadas"]')).toBeNull();
  });

  it.each([
    ['/perfil', 'Mi perfil'],
    ['/perfil/publicaciones', 'Mi perfil'],
    ['/perfil/editar', 'Mi perfil'],
    ['/perfil/guardadas', 'Guardadas'],
    ['/publicaciones', 'Publicaciones'],
  ])('[I] en %s queda marcada sólo «%s»', async (ruta, marcada) => {
    await iniciarSesion();

    await TestBed.inject(Router).navigateByUrl(ruta);
    fixture.detectChanges();
    await fixture.whenStable();

    const activos = Array.from(
      fixture.nativeElement.querySelectorAll('.item-nav.activo') as NodeListOf<HTMLElement>,
    ).map((item) => item.getAttribute('title'));
    expect(activos).toEqual([marcada]);
  });

  it('[I] ofrece español e inglés y marca el idioma actual', () => {
    const botones = [...fixture.nativeElement.querySelectorAll('[aria-pressed]')] as HTMLElement[];

    expect(botones.map((boton) => boton.textContent?.trim())).toEqual(['es', 'en']);
    expect(botones.map((boton) => boton.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('[S] al elegir inglés la barra se traduce, y al volver a español también', async () => {
    const botones = () =>
      [...fixture.nativeElement.querySelectorAll('[aria-pressed]')] as HTMLButtonElement[];

    botones()[1].click();
    await fixture.whenStable();
    expect(texto()).toContain('Log in');
    expect(texto()).not.toContain('Ingresar');

    botones()[0].click();
    await fixture.whenStable();
    expect(texto()).toContain('Ingresar');
  });

  it('[I] cada opción del menú tiene un título (tooltip) además del texto para lectores de pantalla', async () => {
    await iniciarSesion();

    const items = Array.from(
      fixture.nativeElement.querySelectorAll('.item-nav') as NodeListOf<HTMLElement>,
    );

    expect(items.length).toBeGreaterThan(3);
    items.forEach((item) => {
      expect(item.getAttribute('title')).toBeTruthy();
      expect(item.querySelector('.etiqueta-nav')!.textContent!.trim()).toBe(
        item.getAttribute('title'),
      );
    });
  });

  it('[I] no ofrece cambiar de tema: la aplicación es sólo clara', async () => {
    await iniciarSesion();

    expect(fixture.nativeElement.querySelector('.boton-tema')).toBeNull();
    expect(document.documentElement.dataset['tema']).toBeUndefined();
  });

  it('[I] el logo es siempre el ícono principal', () => {
    const logo = fixture.nativeElement.querySelector('.logo') as HTMLImageElement;

    expect(logo.getAttribute('src')).toBe('favicon.png');
  });

  it('[S] al pulsar Salir se borra la sesión y va a la pantalla de inicio', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await iniciarSesion();

    botonSalir().click();
    await fixture.whenStable();

    expect(TestBed.inject(Auth).token()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  describe('la barra de abajo se esconde al bajar y reaparece al subir', () => {
    const escondida = () => barraInferior().classList.contains('oculta');
    const medidas = (alto: number, ventana: number) => {
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        value: alto,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', { value: ventana, configurable: true });
    };

    afterEach(() => medidas(0, 768));

    it('[Z] al abrir la página se ve', () => {
      expect(escondida()).toBe(false);
    });

    it('[I] al bajar se esconde y al subir reaparece', () => {
      desplazarA(300);
      expect(escondida()).toBe(true);

      desplazarA(200);
      expect(escondida()).toBe(false);
    });

    it('[S] al volver a bajar se esconde otra vez, y al subir de nuevo reaparece', () => {
      desplazarA(300);
      desplazarA(200);
      desplazarA(400);
      expect(escondida()).toBe(true);

      desplazarA(350);
      expect(escondida()).toBe(false);
    });

    it('[B] cerca del tope (64 px o menos) siempre se ve, aunque se baje', () => {
      desplazarA(64);
      expect(escondida()).toBe(false);

      desplazarA(65);
      expect(escondida()).toBe(true);
    });

    it('[B] un desplazamiento de 7 píxeles no cuenta y uno de 8 sí', () => {
      desplazarA(300);

      desplazarA(293);
      expect(escondida()).toBe(true);

      desplazarA(292);
      expect(escondida()).toBe(false);
    });

    it('[I] al llegar al final de la página se muestra, para poder navegar', () => {
      medidas(2000, 800);
      desplazarA(600);
      expect(escondida()).toBe(true);

      desplazarA(1195);
      expect(escondida()).toBe(false);
    });

    it('[Z] en una página que no se desplaza no cuenta como "al final"', () => {
      medidas(500, 800);
      desplazarA(300);

      expect(escondida()).toBe(true);
    });
  });

  describe('ingreso docente', () => {
    const URL_DOCENTE = `${environment.API_URL}/auth/acceso-docente`;
    const botonDocente = () =>
      fixture.nativeElement.querySelector('.boton-docente') as HTMLButtonElement | null;
    const sesionDeAdministrador = {
      token: 't',
      usuario: { _id: 'd1', nombreUsuario: 'docente', perfil: 'administrador' },
    };

    it('[O] sin sesión hay un botón muy discreto, sin texto a la vista y con su nombre para lectores de pantalla', () => {
      const boton = botonDocente()!;

      expect(boton.getAttribute('aria-label')).toBe('Ingreso docente');
      expect(boton.getAttribute('title')).toBe('Ingreso docente');
      expect(boton.textContent!.trim()).toBe('');
      expect(boton.querySelector('svg')).not.toBeNull();
    });

    it('[Z] con sesión no se muestra', async () => {
      await iniciarSesion();

      expect(botonDocente()).toBeNull();
    });

    it('[O] al tocarlo entra con la cuenta docente sin pedir ningún dato y lleva al panel de administración', async () => {
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      botonDocente()!.click();
      const solicitud = TestBed.inject(HttpTestingController).expectOne(URL_DOCENTE);
      solicitud.flush(sesionDeAdministrador);
      await fixture.whenStable();

      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toEqual({});
      expect(TestBed.inject(Auth).token()).toBe('t');
      expect(TestBed.inject(Auth).usuario()?.perfil).toBe('administrador');
      expect(navegar).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    it('[S] mientras espera la respuesta se deshabilita y no manda dos pedidos', async () => {
      botonDocente()!.click();
      fixture.detectChanges();

      expect(botonDocente()!.disabled).toBe(true);
      botonDocente()!.click();
      expect(TestBed.inject(HttpTestingController).match(URL_DOCENTE)).toHaveLength(1);
    });

    it('[E] si no está disponible (404) vuelve al ingreso con un aviso y no inicia sesión', async () => {
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      botonDocente()!.click();
      TestBed.inject(HttpTestingController)
        .expectOne(URL_DOCENTE)
        .flush(
          { message: 'x', codigo: 'ACCESO_DOCENTE_NO_DISPONIBLE' },
          { status: 404, statusText: 'Not Found' },
        );
      await fixture.whenStable();

      expect(TestBed.inject(Auth).token()).toBeNull();
      expect(TestBed.inject(Auth).motivoDeSalida()).toBe('api.ACCESO_DOCENTE_NO_DISPONIBLE');
      expect(navegar).toHaveBeenCalledWith(['/login']);
    });

    it('[S] después de un fallo se puede volver a intentar', async () => {
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      botonDocente()!.click();
      TestBed.inject(HttpTestingController)
        .expectOne(URL_DOCENTE)
        .flush({}, { status: 500, statusText: 'x' });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(botonDocente()!.disabled).toBe(false);
    });
  });
});
