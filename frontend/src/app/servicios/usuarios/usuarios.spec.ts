import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UsuariosApi } from './usuarios';

const URL = `${environment.API_URL}/usuarios`;

describe('UsuariosApi', () => {
  let api: UsuariosApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(UsuariosApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('[O] listar pide la página con offset y límite', () => {
    api.listar(20, 5).subscribe();

    const solicitud = http.expectOne((pedido) => pedido.url === URL);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('offset')).toBe('20');
    expect(solicitud.request.params.get('limit')).toBe('5');
    solicitud.flush({ datos: [], offset: 20, limit: 5, hayMas: false });
  });

  it('[Z] listar sin indicar el límite pide 10', () => {
    api.listar(0).subscribe();

    const solicitud = http.expectOne((pedido) => pedido.url === URL);

    expect(solicitud.request.params.get('limit')).toBe('10');
    solicitud.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[E] un error de la API le llega a quien llamó', () => {
    const fallo = vi.fn();
    api.listar(0).subscribe({ error: fallo });

    http
      .expectOne((pedido) => pedido.url === URL)
      .flush({ codigo: 'NO_ES_ADMINISTRADOR' }, { status: 403, statusText: 'Forbidden' });

    expect(fallo).toHaveBeenCalledTimes(1);
    expect(fallo.mock.calls[0][0].status).toBe(403);
  });

  it('[O] crear manda el formulario por POST y devuelve al usuario creado', () => {
    const datos = new FormData();
    datos.append('nombreUsuario', 'nueva_p');
    const creado = vi.fn();
    api.crear(datos).subscribe(creado);

    const solicitud = http.expectOne(URL);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toBe(datos);
    solicitud.flush({ _id: 'u9', nombreUsuario: 'nueva_p' });
    expect(creado).toHaveBeenCalledWith({ _id: 'u9', nombreUsuario: 'nueva_p' });
  });

  it('[E] crear con un correo repetido deja pasar el 409 de la API', () => {
    const fallo = vi.fn();
    api.crear(new FormData()).subscribe({ error: fallo });

    http
      .expectOne(URL)
      .flush({ codigo: 'CORREO_REPETIDO' }, { status: 409, statusText: 'Conflict' });

    expect(fallo.mock.calls[0][0].status).toBe(409);
  });

  it('[O] deshabilitar manda un DELETE al usuario y devuelve al usuario', () => {
    const deshabilitado = vi.fn();
    api.deshabilitar('u9').subscribe(deshabilitado);

    const solicitud = http.expectOne(`${URL}/u9`);

    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush({ _id: 'u9', habilitado: false });
    expect(deshabilitado).toHaveBeenCalledWith({ _id: 'u9', habilitado: false });
  });

  it('[O] habilitar manda un POST a /habilitar del usuario y devuelve al usuario', () => {
    const habilitado = vi.fn();
    api.habilitar('u9').subscribe(habilitado);

    const solicitud = http.expectOne(`${URL}/u9/habilitar`);

    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ _id: 'u9', habilitado: true });
    expect(habilitado).toHaveBeenCalledWith({ _id: 'u9', habilitado: true });
  });

  it.each([
    ['deshabilitar', (id: string) => `${URL}/${id}`],
    ['habilitar', (id: string) => `${URL}/${id}/habilitar`],
  ] as const)('[I] %s codifica el id en la dirección', (accion, direccion) => {
    api[accion]('a/b').subscribe();

    const solicitud = http.expectOne((pedido) => pedido.url.startsWith(URL));

    expect(solicitud.request.url).toBe(direccion('a%2Fb'));
    solicitud.flush({ _id: 'a/b' });
  });

  it('[E] cambiar el estado de la propia cuenta deja pasar el 400 de la API', () => {
    const fallo = vi.fn();
    api.deshabilitar('u1').subscribe({ error: fallo });

    http
      .expectOne(`${URL}/u1`)
      .flush({ codigo: 'CUENTA_PROPIA' }, { status: 400, statusText: 'Bad Request' });

    expect(fallo.mock.calls[0][0].status).toBe(400);
  });

  it('[E] cambiar el estado de una persona que no existe deja pasar el 404 de la API', () => {
    const fallo = vi.fn();
    api.habilitar('u1').subscribe({ error: fallo });

    http
      .expectOne(`${URL}/u1/habilitar`)
      .flush({ codigo: 'USUARIO_NO_ENCONTRADO' }, { status: 404, statusText: 'Not Found' });

    expect(fallo.mock.calls[0][0].status).toBe(404);
  });

  it('[O] obtenerPerfil pide el perfil público por GET a la ruta del usuario', () => {
    TestBed.inject(UsuariosApi).obtenerPerfil('u7').subscribe();

    const solicitud = TestBed.inject(HttpTestingController).expectOne(
      `${environment.API_URL}/usuarios/u7`,
    );

    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({});
  });

  it('[S] un id con caracteres raros se codifica y no cambia la ruta', () => {
    TestBed.inject(UsuariosApi).obtenerPerfil('a/b').subscribe();

    const solicitud = TestBed.inject(HttpTestingController).expectOne(
      `${environment.API_URL}/usuarios/a%2Fb`,
    );

    expect(solicitud.request.url).toContain('/usuarios/a%2Fb');
    solicitud.flush({});
  });
});
