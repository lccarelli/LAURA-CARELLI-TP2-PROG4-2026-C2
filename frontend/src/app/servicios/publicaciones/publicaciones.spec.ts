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

  it('[O] listarComentarios pide los comentarios de esa publicación con offset y límite', () => {
    api.listarComentarios('abc', 20, 5).subscribe();

    const solicitud = http.expectOne((p) => p.url === `${URL}/abc/comentarios`);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('offset')).toBe('20');
    expect(solicitud.request.params.get('limit')).toBe('5');
    solicitud.flush({ datos: [], offset: 20, limit: 5, hayMas: false });
  });

  it('[Z] listarComentarios sin indicar el límite pide 10', () => {
    api.listarComentarios('abc', 0).subscribe();

    const solicitud = http.expectOne((p) => p.url === `${URL}/abc/comentarios`);

    expect(solicitud.request.params.get('limit')).toBe('10');
    solicitud.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[S] listarComentarios codifica el id en la dirección', () => {
    api.listarComentarios('a/b', 0).subscribe();

    const solicitud = http.expectOne((p) => p.url === `${URL}/a%2Fb/comentarios`);

    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[O] comentar envía el mensaje con POST a los comentarios de esa publicación', () => {
    api.comentar('abc', 'Hola').subscribe();

    const solicitud = http.expectOne(`${URL}/abc/comentarios`);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({ mensaje: 'Hola' });
    solicitud.flush({});
  });

  it('[S] comentar codifica el id en la dirección', () => {
    api.comentar('a/b', 'Hola').subscribe();

    const solicitud = http.expectOne(`${URL}/a%2Fb/comentarios`);

    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({});
  });

  it('[O] editarComentario envía el mensaje con PUT al comentario de esa publicación', () => {
    api.editarComentario('abc', 'xyz', 'Nuevo').subscribe();

    const solicitud = http.expectOne(`${URL}/abc/comentarios/xyz`);

    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual({ mensaje: 'Nuevo' });
    solicitud.flush({});
  });

  it('[S] editarComentario codifica los dos ids en la dirección', () => {
    api.editarComentario('a/b', 'c/d', 'Nuevo').subscribe();

    const solicitud = http.expectOne(`${URL}/a%2Fb/comentarios/c%2Fd`);

    expect(solicitud.request.method).toBe('PUT');
    solicitud.flush({});
  });

  it('[Z] listar sin indicar el límite pide 10', () => {
    api.listar(0).subscribe();

    const solicitud = http.expectOne((p) => p.url === URL);

    expect(solicitud.request.params.get('limit')).toBe('10');
    solicitud.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[O] listar pide el offset indicado con GET', () => {
    api.listar(20, 5).subscribe();

    const solicitud = http.expectOne((p) => p.url === URL);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('offset')).toBe('20');
    expect(solicitud.request.params.get('limit')).toBe('5');
    solicitud.flush({ datos: [], offset: 20, limit: 5, hayMas: false });
  });

  it('[Z] listar sin indicar el orden pide por fecha', () => {
    api.listar(0).subscribe();

    const solicitud = http.expectOne((p) => p.url === URL);

    expect(solicitud.request.params.get('orden')).toBe('fecha');
    solicitud.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[O] listar por me gusta pide orden=megusta junto con el offset y el límite', () => {
    api.listar(10, 10, 'megusta').subscribe();

    const solicitud = http.expectOne((p) => p.url === URL);

    expect(solicitud.request.params.get('orden')).toBe('megusta');
    expect(solicitud.request.params.get('offset')).toBe('10');
    expect(solicitud.request.params.get('limit')).toBe('10');
    solicitud.flush({ datos: [], offset: 10, limit: 10, hayMas: false });
  });

  it('[O] listar de una persona agrega usuario a la consulta, y sin ella no lo manda', () => {
    api.listar(0, 3, 'fecha', 'abc123').subscribe();
    api.listar(0, 3).subscribe();

    const [con, sin] = http.match((p) => p.url === URL);

    expect(con.request.params.get('usuario')).toBe('abc123');
    expect(sin.request.params.has('usuario')).toBe(false);
    con.flush({ datos: [], offset: 0, limit: 3, hayMas: false });
    sin.flush({ datos: [], offset: 0, limit: 3, hayMas: false });
  });

  it('[I] crear envía un POST con el formulario', () => {
    const datos = new FormData();
    datos.append('titulo', 'Hola');

    api.crear(datos).subscribe();
    const solicitud = http.expectOne(URL);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toBe(datos);
    solicitud.flush({});
  });

  it('[O] darMeGusta envía un POST sin body a la publicación y devuelve la cantidad', () => {
    let respuesta: unknown;
    api.darMeGusta('abc123').subscribe((r) => (respuesta = r));

    const solicitud = http.expectOne(`${URL}/abc123/megusta`);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({});
    solicitud.flush({ meGusta: true, cantidadMeGusta: 4 });
    expect(respuesta).toEqual({ meGusta: true, cantidadMeGusta: 4 });
  });

  it('[O] quitarMeGusta envía un DELETE a la ruta de me gusta', () => {
    api.quitarMeGusta('abc123').subscribe();

    const solicitud = http.expectOne(`${URL}/abc123/megusta`);

    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('[O] guardar envía un POST sin body a la ruta de guardar', () => {
    api.guardar('abc').subscribe();

    const solicitud = http.expectOne(`${URL}/abc/guardar`);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({});
    solicitud.flush({ guardada: true });
  });

  it('[O] quitarGuardada envía un POST sin body a quitar-guardado', () => {
    api.quitarGuardada('abc').subscribe();

    const solicitud = http.expectOne(`${URL}/abc/quitar-guardado`);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({});
    solicitud.flush({ guardada: false, cantidadGuardados: 0 });
  });

  it.each([
    ['sin filtros', [0, 10], { offset: '0', limit: '10' }],
    ['con letra', [0, 10, 'Ñ'], { offset: '0', limit: '10', letra: 'Ñ' }],
    [
      'con letra, tipo y texto',
      [20, 5, 'A', 'tip', 'tarta'],
      { offset: '20', limit: '5', letra: 'A', tipo: 'tip', q: 'tarta' },
    ],
    ['con letra vacía', [0, 10, null], { offset: '0', limit: '10' }],
  ])('[I] listarGuardadas %s manda sólo lo que se pidió', (_caso, argumentos, esperados) => {
    (api.listarGuardadas as (...valores: unknown[]) => ReturnType<typeof api.listarGuardadas>)(
      ...argumentos,
    ).subscribe();

    const solicitud = http.expectOne((p) => p.url === `${URL}/guardadas`);

    expect(solicitud.request.method).toBe('GET');
    expect(
      Object.fromEntries(
        solicitud.request.params.keys().map((k) => [k, solicitud.request.params.get(k)]),
      ),
    ).toEqual(esperados);
    solicitud.flush({ datos: [], offset: 0, limit: 10, hayMas: false });
  });

  it('[I] letrasGuardadas pide las cantidades, con el texto si hay', () => {
    api.letrasGuardadas('tarta').subscribe();

    const solicitud = http.expectOne((p) => p.url === `${URL}/guardadas/letras`);

    expect(solicitud.request.params.get('q')).toBe('tarta');
    solicitud.flush({ letras: {}, total: 0 });
  });

  it('[Z] letrasGuardadas sin texto no manda q', () => {
    api.letrasGuardadas().subscribe();

    const solicitud = http.expectOne((p) => p.url === `${URL}/guardadas/letras`);

    expect(solicitud.request.params.has('q')).toBe(false);
    solicitud.flush({ letras: {}, total: 0 });
  });

  it('[O] eliminar envía un DELETE a la publicación', () => {
    api.eliminar('abc123').subscribe();

    const solicitud = http.expectOne(`${URL}/abc123`);

    expect(solicitud.request.method).toBe('DELETE');
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('[S] un id con caracteres raros se codifica y no cambia la ruta', () => {
    api.darMeGusta('a/b?c').subscribe();
    api.eliminar('a/b?c').subscribe();

    const megusta = http.expectOne(`${URL}/a%2Fb%3Fc/megusta`);
    const baja = http.expectOne(`${URL}/a%2Fb%3Fc`);

    expect(megusta.request.method).toBe('POST');
    expect(baja.request.method).toBe('DELETE');
    megusta.flush({});
    baja.flush(null);
  });
});
