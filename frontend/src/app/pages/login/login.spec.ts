import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Login } from './login';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

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
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
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

    expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
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

  it('[S] mientras espera la respuesta no envía una segunda vez', async () => {
    componente.formulario.setValue({ identificador: 'laura_c', clave: 'Clave1234' });

    await enviar();
    await enviar();

    expect(http.match(URL)).toHaveLength(1);
  });
});
