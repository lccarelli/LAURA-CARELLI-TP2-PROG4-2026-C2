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

  it('[O] deshabilitar manda un DELETE al usuario', () => {
    const listo = vi.fn();
    api.deshabilitar('u9').subscribe(listo);

    const solicitud = http.expectOne(`${URL}/u9`);

    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
    expect(listo).toHaveBeenCalledTimes(1);
  });

  it('[I] deshabilitar codifica el id en la dirección', () => {
    api.deshabilitar('a/b').subscribe();

    const solicitud = http.expectOne((pedido) => pedido.url.startsWith(URL));

    expect(solicitud.request.url).toBe(`${URL}/a%2Fb`);
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('[E] deshabilitar a uno mismo deja pasar el 400 de la API', () => {
    const fallo = vi.fn();
    api.deshabilitar('u1').subscribe({ error: fallo });

    http
      .expectOne(`${URL}/u1`)
      .flush({ codigo: 'DESHABILITAR_CUENTA_PROPIA' }, { status: 400, statusText: 'Bad Request' });

    expect(fallo.mock.calls[0][0].status).toBe(400);
  });
});
