import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PublicacionesApi } from './publicaciones';

const URL = `${environment.API_URL}/publicaciones`;

describe('PublicacionesApi', () => {
  let api: PublicacionesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PublicacionesApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('[Z] listar sin indicar el límite pide 10', () => {
    api.listar(0).subscribe();

    const pedido = http.expectOne((p) => p.url === URL);

    expect(pedido.request.params.get('limit')).toBe('10');
    pedido.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[O] listar pide el offset indicado con GET', () => {
    api.listar(20, 5).subscribe();

    const pedido = http.expectOne((p) => p.url === URL);

    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('offset')).toBe('20');
    expect(pedido.request.params.get('limit')).toBe('5');
    pedido.flush({ datos: [], offset: 20, limit: 5, hayMas: false });
  });

  it('[I] crear envía un POST con el formulario', () => {
    const datos = new FormData();
    datos.append('titulo', 'Hola');

    api.crear(datos).subscribe();
    const pedido = http.expectOne(URL);

    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toBe(datos);
    pedido.flush({});
  });
});
