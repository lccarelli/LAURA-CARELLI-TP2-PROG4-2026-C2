import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Idioma } from '../../servicios/idioma/idioma';
import { Registro } from './registro';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const URL = `${environment.API_URL}/auth/registro`;

const datosValidos = {
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  clave: 'Clave1234',
  repetirClave: 'Clave1234',
  fechaNacimiento: '1990-05-20',
  descripcion: 'Estudiante',
};

describe('Registro', () => {
  let fixture: ComponentFixture<Registro>;
  let componente: Registro;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

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
    componente = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  });

  it('[I] es una página completa, sin ventana flotante ni portada detrás', () => {
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.acceso-formulario form')).not.toBeNull();
    expect(raiz.querySelectorAll('app-mosaico-comidas img')).toHaveLength(6);
    expect(raiz.querySelector('[role="dialog"], [aria-modal], [inert]')).toBeNull();
    expect(raiz.querySelector('app-inicio')).toBeNull();
    expect(raiz.querySelector('h1')!.textContent).toContain('Crear cuenta');
  });

  it('[Z] con el formulario vacío no envía nada y marca los campos', async () => {
    await enviar();

    http.expectNone(URL);
    expect(componente.mensajeDeError('nombre')).toBe('Este campo es obligatorio');
    expect(componente.mensajeDeError('correo')).toBe('Este campo es obligatorio');
  });

  it('[B] nombre y apellido: 30 caracteres valen y 31 no', () => {
    for (const campo of ['nombre', 'apellido'] as const) {
      componente.formulario.controls[campo].setValue('a'.repeat(30));
      expect(componente.formulario.controls[campo].valid, campo).toBe(true);

      componente.formulario.controls[campo].setValue('a'.repeat(31));
      expect(componente.formulario.controls[campo].valid, campo).toBe(false);
    }
  });

  it('[B] el correo de 30 caracteres vale y el de 31 no', () => {
    const correo = (largo: number) => 'a'.repeat(largo - '@correo.com'.length) + '@correo.com';

    componente.formulario.controls.correo.setValue(correo(30));
    expect(componente.formulario.controls.correo.valid).toBe(true);

    componente.formulario.controls.correo.setValue(correo(31));
    expect(componente.formulario.controls.correo.valid).toBe(false);
  });

  it('[I] las dos claves tienen un botón para verlas', () => {
    expect(fixture.nativeElement.querySelectorAll('app-campo-clave')).toHaveLength(2);
  });

  it('[S] el mensaje de error de un campo cambia al cambiar de idioma', async () => {
    await enviar();
    expect(componente.mensajeDeError('nombre')).toBe('Este campo es obligatorio');

    TestBed.inject(Idioma).cambiar('en');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This field is required');
    expect(fixture.nativeElement.textContent).not.toContain('Este campo es obligatorio');
  });

  it('[O] con datos válidos envía el registro y va a publicaciones', async () => {
    componente.formulario.setValue(datosValidos);

    await enviar();
    http.expectOne(URL).flush({ token: 't', usuario: { _id: '1' } });

    expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
  });

  it('[I] no envía repetirClave y adjunta la imagen elegida', async () => {
    componente.formulario.setValue(datosValidos);
    componente.imagen.set(new File(['x'], 'foto.png', { type: 'image/png' }));

    await enviar();
    const body = http.expectOne(URL).request.body as FormData;

    expect(body.has('repetirClave')).toBe(false);
    expect(body.get('correo')).toBe('laura@correo.com');
    expect((body.get('imagen') as File).name).toBe('foto.png');
  });

  it('[I] descarta los espacios alrededor del texto pero no de la clave', async () => {
    componente.formulario.setValue({
      ...datosValidos,
      nombre: '  Laura  ',
      clave: 'Clave1234',
      repetirClave: 'Clave1234',
    });

    await enviar();
    const body = http.expectOne(URL).request.body as FormData;

    expect(body.get('nombre')).toBe('Laura');
  });

  it('[B] claves que no coinciden bloquean el envío y avisan', async () => {
    componente.formulario.setValue({ ...datosValidos, repetirClave: 'Clave1235' });

    await enviar();

    http.expectNone(URL);
    expect(componente.mensajeDeError('repetirClave')).toBe('Las claves no coinciden');
  });

  it('[B] una clave de 7 caracteres bloquea el envío', async () => {
    componente.formulario.setValue({
      ...datosValidos,
      clave: 'Clave12',
      repetirClave: 'Clave12',
    });

    await enviar();

    http.expectNone(URL);
    expect(componente.mensajeDeError('clave')).toContain('8 y 12');
  });

  it('[E] una imagen inválida muestra el error y no se adjunta', async () => {
    const evento = {
      target: { files: [new File(['x'], 'nota.pdf', { type: 'application/pdf' })] },
    } as unknown as Event;

    componente.elegirImagen(evento);

    expect(componente.errorImagen()).toBe('imagen.tipo');
    expect(componente.imagen()).toBeNull();
  });

  it('[E] si el correo ya existe muestra el aviso y deja reintentar', async () => {
    componente.formulario.setValue(datosValidos);

    await enviar();
    http
      .expectOne(URL)
      .flush({ codigo: 'CORREO_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(componente.mensajeError()).toBe('api.CORREO_REPETIDO');
    expect(componente.enviando()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
  });

  it('[S] mientras espera la respuesta no envía una segunda vez', async () => {
    componente.formulario.setValue(datosValidos);

    await enviar();
    await enviar();

    expect(http.match(URL)).toHaveLength(1);
  });
});
