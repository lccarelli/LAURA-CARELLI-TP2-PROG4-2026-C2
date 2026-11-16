import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { AutoFoco } from '../../directivas/auto-foco/auto-foco';
import { environment } from '../../../environments/environment';
import { Auth } from '../../servicios/auth/auth';
import { Login } from './login';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ESCRITURA_LITERAL, atributosDeEscrituraLiteral } from '../../../testing/teclado';

const URL = `${environment.API_URL}/auth/ingresar`;

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let componente: Login;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  const enviar = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
  });

  it('[I] el foco va al primer campo, el del correo o nombre de usuario, y a ningún otro', () => {
    const conFoco = fixture.debugElement.queryAll(By.directive(AutoFoco));

    expect(conFoco.map((nodo) => nodo.nativeElement.getAttribute('formcontrolname'))).toEqual([
      'identificador',
    ]);
  });

  it('[Z] con el formulario vacío no envía nada y marca los campos', async () => {
    await enviar();

    http.expectNone(URL);
    expect(componente.mensajeDeError('identificador')).toBe('Este campo es obligatorio');
    expect(componente.mensajeDeError('clave')).toBe('Este campo es obligatorio');
  });

  it('[O] con credenciales ingresa y va a publicaciones', async () => {
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'Clave1234' });

    await enviar();
    http.expectOne(URL).flush({ token: 't', usuario: { _id: '1' } });

    expect(navegar).toHaveBeenCalledWith('/publicaciones');
  });

  it.each([
    [
      '[O] vuelve a la pantalla donde venció la sesión',
      '/publicaciones/nueva',
      '/publicaciones/nueva',
    ],
    ['[E] ignora un destino que sale de la aplicación', '//otro-sitio.com', '/publicaciones'],
    ['[Z] sin destino recordado va a publicaciones', null, '/publicaciones'],
  ])('%s', async (_nombre, recordado, esperado) => {
    TestBed.inject(Auth).volverA.set(recordado);
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'Clave1234' });

    await enviar();
    http.expectOne(URL).flush({ token: 't', usuario: { _id: '1' } });

    expect(navegar).toHaveBeenCalledWith(esperado);
    expect(TestBed.inject(Auth).volverA()).toBeNull();
  });

  it('[I] el identificador no se capitaliza ni se corrige en el teléfono', () => {
    const campo = fixture.nativeElement.querySelector('[formcontrolname="identificador"]');

    expect(atributosDeEscrituraLiteral(campo)).toEqual(ESCRITURA_LITERAL);
  });

  it('[I] manda el identificador sin espacios alrededor', async () => {
    componente.formulario.setValue({ identificador: '  laura_c ', clave: 'Clave1234' });

    await enviar();
    const solicitud = http.expectOne(URL);

    expect(solicitud.request.body).toEqual({ identificador: 'laura_c', clave: 'Clave1234' });
  });

  it('[I] es una página completa, sin ventana flotante ni portada detrás', () => {
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.acceso-formulario form')).not.toBeNull();
    expect(raiz.querySelectorAll('app-mosaico-comidas img')).toHaveLength(6);
    expect(raiz.querySelector('[role="dialog"], [aria-modal], [inert]')).toBeNull();
    expect(raiz.querySelector('app-inicio')).toBeNull();
    expect(raiz.querySelector('h1')!.textContent).toContain('Ingresar');
  });

  it('[I] la clave tiene un botón para verla', () => {
    expect(fixture.nativeElement.querySelectorAll('app-campo-clave')).toHaveLength(1);
  });

  it('[B] una clave de 12 caracteres envía y una de 13 no', async () => {
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'a'.repeat(13) });
    await enviar();
    http.expectNone(URL);
    expect(componente.mensajeDeError('clave')).toContain('12');

    componente.formulario.setValue({ identificador: 'laura_c', clave: 'a'.repeat(12) });
    await enviar();
    http.expectOne(URL);
  });

  it('[B] un identificador de 30 caracteres envía y uno de 31 no', async () => {
    componente.formulario.setValue({ identificador: 'a'.repeat(31), clave: 'Clave1234' });
    await enviar();
    http.expectNone(URL);
    expect(componente.mensajeDeError('identificador')).toContain('30');

    componente.formulario.setValue({ identificador: 'a'.repeat(30), clave: 'Clave1234' });
    await enviar();
    http.expectOne(URL);
  });

  it('[E] con credenciales incorrectas muestra el aviso y deja reintentar', async () => {
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'mala' });

    await enviar();
    http
      .expectOne(URL)
      .flush({ codigo: 'CREDENCIALES_INVALIDAS' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(componente.mensajeError()).toBe('api.CREDENCIALES_INVALIDAS');
    expect(componente.enviando()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('[E] si la cuenta está deshabilitada avisa que está deshabilitada, no que las credenciales fallaron', async () => {
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'Clave1234' });

    await enviar();
    http
      .expectOne(URL)
      .flush({ codigo: 'USUARIO_DESHABILITADO' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(componente.mensajeError()).toBe('api.USUARIO_DESHABILITADO');
    expect(fixture.nativeElement.textContent).toContain('Tu usuario está deshabilitado');
    expect(fixture.nativeElement.textContent).toContain('Contactá a un administrador');
    expect(fixture.nativeElement.textContent).not.toContain('incorrectos');
    expect(navegar).not.toHaveBeenCalled();
    expect(TestBed.inject(Auth).token()).toBeNull();
  });

  it('[S] mientras espera la respuesta no envía una segunda vez', async () => {
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'Clave1234' });

    await enviar();
    await enviar();

    expect(http.match(URL)).toHaveLength(1);
  });

  describe('aviso de sesión cerrada', () => {
    const aviso = () => fixture.nativeElement.querySelector('app-aviso') as HTMLElement | null;
    const cerrarSesionPor = async (motivo: string | null) => {
      TestBed.inject(Auth).motivoDeSalida.set(motivo);
      await fixture.whenStable();
    };

    it('[Z] si se llegó sin que se cerrara la sesión, no hay aviso', () => {
      expect(aviso()).toBeNull();
    });

    it('[O] si la sesión se cerró por un 401, explica el motivo', async () => {
      await cerrarSesionPor('api.SESION_VENCIDA');

      expect(aviso()?.textContent).toContain('Sesión cerrada');
      expect(aviso()?.textContent).toContain('Tu sesión llegó a su duración máxima');
    });

    it('[I] es un aviso informativo, no de error', async () => {
      await cerrarSesionPor('api.TOKEN_INVALIDO');

      expect(aviso()?.querySelector('.aviso-info')).not.toBeNull();
    });

    it('[S] se puede cerrar', async () => {
      await cerrarSesionPor('api.TOKEN_INVALIDO');

      (aviso()?.querySelector('button') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(aviso()).toBeNull();
    });

    it('[S] sigue ahí si el primer intento de ingresar falla', async () => {
      await cerrarSesionPor('api.TOKEN_INVALIDO');
      componente.formulario.setValue({ identificador: 'laura_c', clave: 'Mala1234' });

      await enviar();
      http
        .expectOne(URL)
        .flush({ codigo: 'CREDENCIALES_INVALIDAS' }, { status: 401, statusText: 'Unauthorized' });
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelectorAll('app-aviso')).toHaveLength(2);
    });
  });
});
