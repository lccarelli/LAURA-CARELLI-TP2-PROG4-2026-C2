import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Google } from '../../servicios/google/google';
import { Instalacion } from '../../servicios/instalacion/instalacion';
import { BotonGoogle } from './boton-google';

describe('BotonGoogle', () => {
  let fixture: ComponentFixture<BotonGoogle>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  let alRecibir: ((credencial: string) => void) | undefined;
  let fallos: (string | null)[];

  const crear = async (disponible: boolean, dibuja = true) => {
    TestBed.configureTestingModule({
      imports: [BotonGoogle],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Google,
          useValue: {
            disponible,
            mostrarBoton: vi.fn(async (_c: HTMLElement, callback: (c: string) => void) => {
              alRecibir = callback;
              return dibuja;
            }),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(BotonGoogle);
    fallos = [];
    fixture.componentInstance.fallo.subscribe((mensaje) => fallos.push(mensaje));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const sesion = { token: 't', usuario: { ...usuarioDePrueba, _id: 'g1' } };

  beforeEach(() => {
    localStorage.clear();
    alRecibir = undefined;
  });

  afterEach(() => {
    environment.GOOGLE_CLIENT_ID = '';
  });

  it('[Z] sin ID de cliente no muestra nada: ni el separador ni el botón', async () => {
    const raiz = await crear(false);

    expect(raiz.querySelector('.acceso-google')).toBeNull();
    expect(raiz.textContent!.trim()).toBe('');
  });

  it('[O] con Google disponible muestra el separador «o» y el lugar del botón oficial', async () => {
    const raiz = await crear(true);

    expect(raiz.querySelector('.acceso-google')!.classList).not.toContain('oculto');
    expect(raiz.querySelector('.separador-o')!.textContent).toContain('o');
    expect(raiz.querySelector('.boton-google')).not.toBeNull();
  });

  it('[E] si el SDK no se pudo cargar (sin internet, bloqueador) queda oculto, sin romper el formulario', async () => {
    const raiz = await crear(true, false);

    expect(raiz.querySelector('.acceso-google')!.classList).toContain('oculto');
  });

  it('[O] al recibir la credencial la manda al servidor, guarda la sesión y va al inicio', async () => {
    await crear(true);
    const ofrecer = vi.spyOn(TestBed.inject(Instalacion), 'ofrecerAlIngresar');

    alRecibir!('credencial-de-google');
    const solicitud = http.expectOne(`${environment.API_URL}/auth/google`);
    solicitud.flush(sesion);

    expect(solicitud.request.body).toEqual({ credencial: 'credencial-de-google' });
    expect(TestBed.inject(Auth).token()).toBe('t');
    expect(ofrecer).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/home');
  });

  it('[S] vuelve a donde se quería ir antes de pedir el ingreso (la misma regla que el formulario)', async () => {
    await crear(true);
    TestBed.inject(Auth).volverA.set('/publicaciones/abc');

    alRecibir!('c');
    http.expectOne(`${environment.API_URL}/auth/google`).flush(sesion);

    expect(navegar).toHaveBeenCalledWith('/publicaciones/abc');
  });

  it.each([
    ['GOOGLE_CREDENCIAL_INVALIDA', 401, 'api.GOOGLE_CREDENCIAL_INVALIDA'],
    ['GOOGLE_CORREO_NO_VERIFICADO', 401, 'api.GOOGLE_CORREO_NO_VERIFICADO'],
    ['USUARIO_DESHABILITADO', 403, 'api.USUARIO_DESHABILITADO'],
    ['GOOGLE_NO_DISPONIBLE', 404, 'api.GOOGLE_NO_DISPONIBLE'],
  ])(
    '[E] si el servidor responde %s (%i) avisa con «%s» y no entra',
    async (codigo, estado, clave) => {
      await crear(true);

      alRecibir!('c');
      http
        .expectOne(`${environment.API_URL}/auth/google`)
        .flush({ codigo }, { status: estado, statusText: 'x' });

      expect(fallos).toEqual([null, clave]);
      expect(TestBed.inject(Auth).token()).toBeNull();
      expect(navegar).not.toHaveBeenCalled();
    },
  );

  it('[S] al volver a intentar borra el aviso de error anterior', async () => {
    await crear(true);

    alRecibir!('c');
    http
      .expectOne(`${environment.API_URL}/auth/google`)
      .flush({ codigo: 'X' }, { status: 500, statusText: 'x' });
    alRecibir!('c');
    http.expectOne(`${environment.API_URL}/auth/google`).flush(sesion);

    expect(fallos[fallos.length - 1]).toBeNull();
  });
});
