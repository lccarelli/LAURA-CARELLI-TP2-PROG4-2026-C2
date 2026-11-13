import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { EstadisticasApi } from './estadisticas';

const URL = `${environment.API_URL}/estadisticas/publicaciones-por-usuario`;

describe('EstadisticasApi', () => {
  let api: EstadisticasApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(EstadisticasApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('[O] pide las publicaciones por usuario con desde y hasta', () => {
    const recibido = vi.fn();
    api.publicacionesPorUsuario('2026-03-01', '2026-03-31').subscribe(recibido);

    const solicitud = http.expectOne((pedido) => pedido.url === URL);
    solicitud.flush([{ usuario: 'u1', nombreUsuario: 'laura_c', cantidad: 2 }]);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('desde')).toBe('2026-03-01');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-31');
    expect(recibido).toHaveBeenCalledWith([
      { usuario: 'u1', nombreUsuario: 'laura_c', cantidad: 2 },
    ]);
  });

  it('[E] un error de la API le llega a quien llamó', () => {
    const fallo = vi.fn();
    api.publicacionesPorUsuario('2026-03-31', '2026-03-01').subscribe({ error: fallo });

    http
      .expectOne((pedido) => pedido.url === URL)
      .flush({ codigo: 'RANGO_INVALIDO' }, { status: 400, statusText: 'Bad Request' });

    expect(fallo).toHaveBeenCalledTimes(1);
    expect(fallo.mock.calls[0][0].error.codigo).toBe('RANGO_INVALIDO');
  });

  it('[O] pide los comentarios por día con desde y hasta', () => {
    const recibido = vi.fn();
    api.comentariosPorDia('2026-03-10', '2026-03-12').subscribe(recibido);

    const solicitud = http.expectOne(
      (pedido) => pedido.url === `${environment.API_URL}/estadisticas/comentarios-por-dia`,
    );
    solicitud.flush([{ fecha: '2026-03-10', cantidad: 2 }]);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('desde')).toBe('2026-03-10');
    expect(solicitud.request.params.get('hasta')).toBe('2026-03-12');
    expect(recibido).toHaveBeenCalledWith([{ fecha: '2026-03-10', cantidad: 2 }]);
  });
});
