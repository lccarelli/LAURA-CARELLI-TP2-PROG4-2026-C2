import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { reintentoInterceptor } from './reintento-interceptor';

const URL = '/datos';

describe('reintentoInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let resultado: { valor?: unknown; error?: unknown };

  const pedir = (metodo: 'get' | 'post' = 'get') => {
    resultado = {};
    const peticion = metodo === 'get' ? http.get(URL) : http.post(URL, {});
    peticion.subscribe({
      next: (valor) => (resultado.valor = valor),
      error: (error) => (resultado.error = error),
    });
  };

  const fallar = (estado: number) =>
    controlador.expectOne(URL).flush('error', { status: estado, statusText: 'Error' });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([reintentoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('[Z] si el primer intento funciona hace un solo pedido', () => {
    pedir();

    controlador.expectOne(URL).flush({ ok: true });

    expect(resultado.valor).toEqual({ ok: true });
    controlador.verify();
  });

  it('[O] si falla con 503 y después funciona, entrega el resultado', async () => {
    pedir();

    fallar(503);
    await vi.advanceTimersByTimeAsync(500);
    controlador.expectOne(URL).flush({ ok: true });

    expect(resultado.valor).toEqual({ ok: true });
    expect(resultado.error).toBeUndefined();
  });

  it('[M] si falla tres veces seguidas se rinde con el error', async () => {
    pedir();

    fallar(503);
    await vi.advanceTimersByTimeAsync(500);
    fallar(503);
    await vi.advanceTimersByTimeAsync(1000);
    fallar(503);

    expect(resultado.error).toBeDefined();
    controlador.verify();
  });

  it('[B] espera 500 ms antes del primer reintento y 1000 ms antes del segundo', async () => {
    pedir();

    fallar(503);
    await vi.advanceTimersByTimeAsync(499);
    controlador.expectNone(URL);
    await vi.advanceTimersByTimeAsync(1);
    fallar(503);
    await vi.advanceTimersByTimeAsync(999);
    controlador.expectNone(URL);
    await vi.advanceTimersByTimeAsync(1);
    controlador.expectOne(URL).flush({ ok: true });
  });

  it('[I] un pedido que no es GET no se reintenta', () => {
    pedir('post');

    fallar(503);

    expect(resultado.error).toBeDefined();
    controlador.verify();
  });

  it('[E] los errores 400, 401 y 404 no se reintentan', () => {
    for (const estado of [400, 401, 404]) {
      pedir();
      fallar(estado);

      expect(resultado.error).toBeDefined();
      controlador.verify();
    }
  });

  it('[E] un error de red sin respuesta sí se reintenta', async () => {
    pedir();

    controlador.expectOne(URL).error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(500);
    controlador.expectOne(URL).flush({ ok: true });

    expect(resultado.valor).toEqual({ ok: true });
  });
});
