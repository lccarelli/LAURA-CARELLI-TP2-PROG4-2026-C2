import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';
import { Sesion } from './sesion';

const REFRESCAR = `${environment.API_URL}/auth/refrescar`;
const MINUTO = 60 * 1000;

describe('Sesion', () => {
  let http: HttpTestingController;
  let auth: Auth;

  const usar = (evento = 'pointerdown') => document.dispatchEvent(new Event(evento));
  const pedidos = () => http.match(REFRESCAR);

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    auth.token.set('token-inicial');
    TestBed.inject(Sesion).iniciar();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('[Z] si nadie usa la aplicación, nunca renueva la sesión', () => {
    vi.advanceTimersByTime(60 * MINUTO);

    expect(pedidos()).toHaveLength(0);
  });

  it('[O] si se usa la aplicación, renueva en la próxima revisión y guarda el token', () => {
    usar();
    vi.advanceTimersByTime(MINUTO - 1);
    expect(pedidos()).toHaveLength(0);

    vi.advanceTimersByTime(1);
    const [pedido] = pedidos();
    pedido.flush({ token: 'token-nuevo' });

    expect(pedido.request.method).toBe('POST');
    expect(auth.token()).toBe('token-nuevo');
  });

  it('[S] mientras se sigue usando renueva como mucho una vez por minuto', () => {
    usar();
    vi.advanceTimersByTime(MINUTO);
    expect(pedidos()).toHaveLength(1);

    for (let minuto = 0; minuto < 3; minuto++) {
      usar();
      usar('keydown');
      vi.advanceTimersByTime(MINUTO);
      expect(pedidos()).toHaveLength(1);
    }
  });

  it('[S] una sola acción renueva una vez y después, sin actividad, no insiste', () => {
    usar();
    vi.advanceTimersByTime(MINUTO);
    expect(pedidos()).toHaveLength(1);

    vi.advanceTimersByTime(30 * MINUTO);
    expect(pedidos()).toHaveLength(0);
  });

  it.each(['pointerdown', 'keydown', 'scroll', 'touchstart'])(
    '[I] el evento %s cuenta como uso de la aplicación',
    (evento) => {
      usar(evento);
      vi.advanceTimersByTime(MINUTO);

      expect(pedidos()).toHaveLength(1);
    },
  );

  it('[I] otros eventos, como mover el mouse, no cuentan como uso', () => {
    usar('mousemove');
    vi.advanceTimersByTime(5 * MINUTO);

    expect(pedidos()).toHaveLength(0);
  });

  it('[B] sin sesión iniciada no renueva aunque haya actividad', () => {
    auth.token.set(null);

    usar();
    vi.advanceTimersByTime(5 * MINUTO);

    expect(pedidos()).toHaveLength(0);
  });

  it('[E] si la sesión ya venció (401) no insiste hasta que haya nueva actividad', () => {
    usar();
    vi.advanceTimersByTime(MINUTO);
    pedidos()[0].flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });

    vi.advanceTimersByTime(10 * MINUTO);
    expect(pedidos()).toHaveLength(0);
    expect(auth.token()).toBe('token-inicial');

    usar();
    vi.advanceTimersByTime(MINUTO);
    expect(pedidos()).toHaveLength(1);
  });

  it('[E] si falla la red reintenta en la siguiente revisión, sin esperar otra acción', () => {
    usar();
    vi.advanceTimersByTime(MINUTO);
    pedidos()[0].error(new ProgressEvent('error'));

    vi.advanceTimersByTime(MINUTO);

    expect(pedidos()).toHaveLength(1);
  });

  it('[I] al cerrarse el servicio deja de escuchar y de revisar', () => {
    TestBed.resetTestingModule();

    usar();
    vi.advanceTimersByTime(5 * MINUTO);

    expect(pedidos()).toHaveLength(0);
  });
});
