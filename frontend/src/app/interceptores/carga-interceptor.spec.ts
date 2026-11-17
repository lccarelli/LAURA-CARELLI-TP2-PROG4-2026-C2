import { HttpContext, provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  Carga,
  MENSAJE_DE_CARGA,
  RETRASO_MS,
  SIN_INDICADOR_DE_CARGA,
} from '../servicios/carga/carga';
import { cargaInterceptor } from './carga-interceptor';

const URL = 'http://api.test';

describe('cargaInterceptor', () => {
  let http: HttpClient;
  let control: HttpTestingController;
  let carga: Carga;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cargaInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    control = TestBed.inject(HttpTestingController);
    carga = TestBed.inject(Carga);
  });

  afterEach(() => vi.useRealTimers());

  it('[O] una solicitud lenta muestra la espera a los 0,2 segundos con el mensaje de esa acción', () => {
    http.post(`${URL}/auth/ingresar`, {}).subscribe();

    vi.advanceTimersByTime(RETRASO_MS);

    expect(carga.visible()).toBe(true);
    expect(carga.mensaje()).toBe('carga.ingresando');
    control.expectOne(`${URL}/auth/ingresar`).flush({});
  });

  it('[S] al responder la espera se apaga', () => {
    http.get(`${URL}/publicaciones/abc`).subscribe();
    vi.advanceTimersByTime(RETRASO_MS + 1000);

    control.expectOne(`${URL}/publicaciones/abc`).flush({});
    vi.advanceTimersByTime(0);

    expect(carga.visible()).toBe(false);
  });

  it('[S] si falla (500) la espera también se apaga', () => {
    http.get(`${URL}/publicaciones/abc`).subscribe({ error: () => undefined });
    vi.advanceTimersByTime(RETRASO_MS + 1000);

    control.expectOne(`${URL}/publicaciones/abc`).flush({}, { status: 500, statusText: 'Error' });
    vi.advanceTimersByTime(0);

    expect(carga.visible()).toBe(false);
  });

  it('[S] si se cancela la solicitud la espera también se apaga', () => {
    const suscripcion = http.get(`${URL}/publicaciones/abc`).subscribe();
    vi.advanceTimersByTime(RETRASO_MS + 1000);

    suscripcion.unsubscribe();
    vi.advanceTimersByTime(0);

    expect(carga.visible()).toBe(false);
  });

  it('[I] una página siguiente dice «Trayendo más publicaciones»', () => {
    http.get(`${URL}/publicaciones`, { params: { offset: 20, limit: 10 } }).subscribe();

    vi.advanceTimersByTime(RETRASO_MS);

    expect(carga.mensaje()).toBe('carga.trayendo_mas');
    control.expectOne((s) => s.url === `${URL}/publicaciones`).flush({});
  });

  it.each([
    '/notificaciones/sin-leer',
    '/notificaciones',
    '/auth/refrescar',
    '/auth/autorizar',
    '/health',
    '/push/clave-publica',
    '/guardadas/letras',
  ])('[E] %s no muestra la espera: es en segundo plano', (ruta) => {
    http.get(`${URL}${ruta}`).subscribe();

    vi.advanceTimersByTime(RETRASO_MS * 10);

    expect(carga.visible()).toBe(false);
    control.expectOne(`${URL}${ruta}`).flush({});
  });

  it('[S] se puede apagar por solicitud con el contexto', () => {
    http
      .get(`${URL}/publicaciones/abc`, {
        context: new HttpContext().set(SIN_INDICADOR_DE_CARGA, true),
      })
      .subscribe();

    vi.advanceTimersByTime(RETRASO_MS * 10);

    expect(carga.visible()).toBe(false);
    control.expectOne(`${URL}/publicaciones/abc`).flush({});
  });

  it('[S] el contexto puede poner un mensaje propio a una solicitud', () => {
    http
      .get(`${URL}/publicaciones/abc`, {
        context: new HttpContext().set(MENSAJE_DE_CARGA, { clave: 'carga.calculando' }),
      })
      .subscribe();

    vi.advanceTimersByTime(RETRASO_MS);

    expect(carga.mensaje()).toBe('carga.calculando');
    control.expectOne(`${URL}/publicaciones/abc`).flush({});
  });
});
