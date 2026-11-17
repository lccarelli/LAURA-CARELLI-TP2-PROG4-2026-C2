import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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

  describe('movimiento al volver hacia arriba', () => {
    it('[Z] al abrir la página no se mueve', () => {
      expect(barraInferior().classList).not.toContain('subiendo');
    });

    it('[I] al bajar no se mueve y al subir sí', () => {
      desplazarA(300);
      expect(barraInferior().classList).not.toContain('subiendo');

      desplazarA(200);
      expect(barraInferior().classList).toContain('subiendo');
    });

    it('[S] al volver a bajar deja de moverse y al subir de nuevo se repite', () => {
      desplazarA(300);
      desplazarA(200);
      desplazarA(400);
      expect(barraInferior().classList).not.toContain('subiendo');

      desplazarA(350);
      expect(barraInferior().classList).toContain('subiendo');
    });

    it('[B] un desplazamiento de 7 píxeles no cuenta y uno de 8 sí', () => {
      desplazarA(300);

      desplazarA(293);
      expect(barraInferior().classList).not.toContain('subiendo');

      desplazarA(292);
      expect(barraInferior().classList).toContain('subiendo');
    });
  });
});
