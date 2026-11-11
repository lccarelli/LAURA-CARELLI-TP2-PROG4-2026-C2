import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { datosDelFormulario } from '../../../testing/usuario';
import { FormularioUsuario } from '../../componentes/formulario-usuario/formulario-usuario';
import { NuevoUsuario } from './nuevo-usuario';

const URL = `${environment.API_URL}/usuarios`;

describe('NuevoUsuario', () => {
  let fixture: ComponentFixture<NuevoUsuario>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  const elemento = () => fixture.nativeElement as HTMLElement;
  const formulario = () =>
    fixture.debugElement.query(By.directive(FormularioUsuario))
      .componentInstance as FormularioUsuario;
  const radios = () =>
    Array.from(elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const enlaceA = (destino: string) => elemento().querySelectorAll(`a[href="${destino}"]`);

  const enviar = async (cambios: Record<string, string> = {}) => {
    formulario().formulario.setValue({ ...datosDelFormulario, ...cambios });
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoUsuario],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(NuevoUsuario);
    await fixture.whenStable();
  });

  it('[I] es una página con su título y el formulario, sin pedir nada al abrirla', () => {
    expect(elemento().querySelector('h1')!.textContent).toContain('Nuevo usuario');
    expect(elemento().querySelector('form')).not.toBeNull();
    expect(http.match(URL)).toHaveLength(0);
  });

  it('[I] los campos van sobre el fondo de la página, no dentro de una tarjeta blanca', () => {
    expect(elemento().querySelector('.tarjeta')).toBeNull();
    expect(elemento().querySelector('form .caja')).not.toBeNull();
  });

  it('[I] usa la página ancha del 70% de la pantalla', () => {
    expect(elemento().querySelector('section.pagina-amplia')).not.toBeNull();
  });

  it('[I] ofrece los dos radio buttons de perfil, con Usuario elegido', () => {
    expect(radios().map((radio) => radio.value)).toEqual(['usuario', 'administrador']);
    expect(radios().map((radio) => radio.checked)).toEqual([true, false]);
  });

  it('[I] tiene un enlace para volver y un Cancelar, los dos al listado', () => {
    expect(enlaceA('/dashboard/usuarios')).toHaveLength(2);
    expect(elemento().textContent).toContain('Volver a usuarios');
    expect(elemento().textContent).toContain('Cancelar');
  });

  it('[Z] con el formulario vacío no envía nada', async () => {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(http.match(URL)).toHaveLength(0);
  });

  it('[O] con datos válidos envía el alta con el perfil elegido', async () => {
    radios()[1].click();

    await enviar({ perfil: 'administrador' });
    const solicitud = http.expectOne(URL);
    const body = solicitud.request.body as FormData;

    expect(solicitud.request.method).toBe('POST');
    expect(body.get('nombreUsuario')).toBe('laura_c');
    expect(body.get('perfil')).toBe('administrador');
    expect(body.has('repetirClave')).toBe(false);
    solicitud.flush({ _id: 'u9', nombreUsuario: 'laura_c' });
  });

  it('[O] al crearla vuelve al listado y le pasa el nombre de usuario para avisar', async () => {
    await enviar();

    http.expectOne(URL).flush({ _id: 'u9', nombreUsuario: 'laura_c' });

    expect(navegar).toHaveBeenCalledWith(['/dashboard/usuarios'], {
      state: { creado: 'laura_c' },
    });
  });

  it('[E] si el correo ya existe avisa, se queda en la página y conserva lo escrito', async () => {
    await enviar();

    http
      .expectOne(URL)
      .flush({ codigo: 'CORREO_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    await actualizar();

    expect(elemento().textContent).toContain('El correo ya está registrado');
    expect(navegar).not.toHaveBeenCalled();
    expect(formulario().formulario.getRawValue().correo).toBe('laura@correo.com');
  });

  it('[E] si el usuario ya existe avisa con el mensaje de ese error', async () => {
    await enviar();

    http
      .expectOne(URL)
      .flush({ codigo: 'USUARIO_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    await actualizar();

    expect(elemento().textContent).toContain('El nombre de usuario ya está registrado');
  });

  it('[E] sin conexión avisa que no se pudo conectar', async () => {
    await enviar();

    http.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });
    await actualizar();

    expect(elemento().textContent).toContain('No se pudo conectar');
  });

  it('[E] después de un error se puede reintentar y crear', async () => {
    await enviar();
    http
      .expectOne(URL)
      .flush({ codigo: 'USUARIO_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    await actualizar();

    await enviar({ nombreUsuario: 'otra_p' });
    http.expectOne(URL).flush({ _id: 'u9', nombreUsuario: 'otra_p' });

    expect(navegar).toHaveBeenCalledWith(['/dashboard/usuarios'], { state: { creado: 'otra_p' } });
  });

  it('[S] mientras espera la respuesta no envía una segunda vez', async () => {
    await enviar();
    await enviar();

    expect(http.match(URL)).toHaveLength(1);
  });

  it('[S] el aviso de error se puede cerrar', async () => {
    await enviar();
    http
      .expectOne(URL)
      .flush({ codigo: 'CORREO_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    await actualizar();

    (elemento().querySelector('app-aviso .boton-icono') as HTMLButtonElement).click();
    await actualizar();

    expect(elemento().querySelector('app-aviso')).toBeNull();
  });
});
