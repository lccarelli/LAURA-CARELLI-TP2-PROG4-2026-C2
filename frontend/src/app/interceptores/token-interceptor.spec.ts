import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Auth } from '../servicios/auth/auth';
import { tokenInterceptor } from './token-interceptor';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  it('[Z] sin token no agrega el header', () => {
    http.get(`${environment.API_URL}/publicaciones`).subscribe();

    const pedido = controlador.expectOne(`${environment.API_URL}/publicaciones`);
    expect(pedido.request.headers.has('Authorization')).toBe(false);
  });

  it('[O] con token agrega Authorization Bearer', () => {
    localStorage.setItem('token', 'abc');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);

    http.get(`${environment.API_URL}/publicaciones`).subscribe();

    const pedido = controlador.expectOne(`${environment.API_URL}/publicaciones`);
    expect(pedido.request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('[I] no manda el token a direcciones que no son de la API', () => {
    TestBed.inject(Auth).token.set('abc');

    http.get('https://otro-sitio.com/datos').subscribe();

    const pedido = controlador.expectOne('https://otro-sitio.com/datos');
    expect(pedido.request.headers.has('Authorization')).toBe(false);
  });

  it('[S] después de salir deja de agregar el token', () => {
    const auth = TestBed.inject(Auth);
    auth.token.set('abc');
    auth.salir();

    http.get(`${environment.API_URL}/publicaciones`).subscribe();

    const pedido = controlador.expectOne(`${environment.API_URL}/publicaciones`);
    expect(pedido.request.headers.has('Authorization')).toBe(false);
  });
});
