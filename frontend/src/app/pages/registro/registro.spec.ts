import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { FormularioUsuario } from '../../componentes/formulario-usuario/formulario-usuario';
import { Registro } from './registro';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { datosDelFormulario } from '../../../testing/usuario';

const URL = `${environment.API_URL}/auth/registro`;

describe('Registro', () => {
  let fixture: ComponentFixture<Registro>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  const formulario = () =>
    fixture.debugElement.query(By.directive(FormularioUsuario))
      .componentInstance as FormularioUsuario;

  const enviar = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Registro],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Registro);
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  });

  it('[I] es una página completa, sin ventana flotante ni portada detrás', () => {
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.acceso-formulario form')).not.toBeNull();
    expect(raiz.querySelector('app-panel-publicaciones')).not.toBeNull();
    expect(raiz.querySelector('[role="dialog"], [aria-modal], [inert]')).toBeNull();
    expect(raiz.querySelector('app-inicio')).toBeNull();
    expect(raiz.querySelector('h1')!.textContent).toContain('Crear cuenta');
  });

  it('[I] el formulario no pide perfil: quien se registra nunca elige ser administrador', () => {
    expect(fixture.nativeElement.querySelector('input[type="radio"]')).toBeNull();
  });

  it('[Z] con el formulario vacío no envía nada', async () => {
    await enviar();

    expect(http.match(URL)).toHaveLength(0);
  });

  it('[O] con datos válidos envía el registro y va al inicio', async () => {
    formulario().formulario.setValue(datosDelFormulario);

    await enviar();
    http.expectOne(URL).flush({ token: 't', usuario: { _id: '1' } });

    expect(navegar).toHaveBeenCalledWith(['/home']);
  });

  it('[I] manda los datos sin repetirClave ni perfil y con la imagen elegida', async () => {
    formulario().formulario.setValue(datosDelFormulario);
    formulario().imagen.set(new File(['x'], 'foto.png', { type: 'image/png' }));

    await enviar();
    const body = http.expectOne(URL).request.body as FormData;

    expect(body.get('correo')).toBe('laura@correo.com');
    expect(body.has('repetirClave')).toBe(false);
    expect(body.has('perfil')).toBe(false);
    expect((body.get('imagen') as File).name).toBe('foto.png');
  });

  it('[E] si el correo ya existe muestra el aviso y deja reintentar', async () => {
    formulario().formulario.setValue(datosDelFormulario);

    await enviar();
    http
      .expectOne(URL)
      .flush({ codigo: 'CORREO_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.componentInstance.mensajeError()).toBe('api.CORREO_REPETIDO');
    expect(fixture.componentInstance.enviando()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
  });

  it('[S] mientras espera la respuesta no envía una segunda vez', async () => {
    formulario().formulario.setValue(datosDelFormulario);

    await enviar();
    await enviar();

    expect(http.match(URL)).toHaveLength(1);
  });
});
