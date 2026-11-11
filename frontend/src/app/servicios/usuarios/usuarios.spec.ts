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
});
