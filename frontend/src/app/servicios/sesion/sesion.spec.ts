import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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

describe('Sesion al iniciar la aplicación', () => {
  const AUTORIZAR = `${environment.API_URL}/auth/autorizar`;
  const SALUD = `${environment.API_URL}/health`;
  let http: HttpTestingController;
  let auth: Auth;
  let sesion: Sesion;
  let irA: ReturnType<typeof vi.spyOn>;

  const iniciarConToken = (token: string | null) => {
    auth.token.set(token);
    sesion.iniciar();
  };
  const rechazar = (status: number) =>
    http.expectOne(AUTORIZAR).flush({ codigo: 'TOKEN_INVALIDO' }, { status, statusText: 'Error' });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    sesion = TestBed.inject(Sesion);
    irA = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('[Z] sin token no valida nada y no muestra la pantalla de carga', () => {
    iniciarConToken(null);

    http.expectNone(AUTORIZAR);
    expect(sesion.verificando()).toBe(false);
  });

  it('[O] con token valida la sesión y muestra la pantalla de carga hasta que responde', () => {
    iniciarConToken('vigente');
    expect(sesion.verificando()).toBe(true);

    http.expectOne(AUTORIZAR).flush({ usuario: { _id: '1', nombre: 'Laura' } });

    expect(sesion.verificando()).toBe(false);
    expect(auth.token()).toBe('vigente');
    expect(irA).not.toHaveBeenCalled();
  });

  it('[E] si el token venció (401) cierra la sesión y lleva al login', () => {
    localStorage.setItem('token', 'vencido');
    iniciarConToken('vencido');

    rechazar(401);

    expect(sesion.verificando()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it.each([0, 500, 503])('[E] si el servidor falla (%i) no cierra la sesión', (status) => {
    iniciarConToken('vigente');

    rechazar(status);

    expect(sesion.verificando()).toBe(false);
    expect(auth.token()).toBe('vigente');
    expect(irA).not.toHaveBeenCalled();
  });

  it('[S] sin token despierta al servidor en segundo plano, sin pantalla de carga', () => {
    iniciarConToken(null);

    const pedido = http.expectOne(SALUD);

    expect(sesion.verificando()).toBe(false);
    pedido.flush({ status: 'ok' });
  });

  it('[E] si despertar al servidor falla, no pasa nada', () => {
    iniciarConToken(null);

    http.expectOne(SALUD).error(new ProgressEvent('error'));

    expect(sesion.verificando()).toBe(false);
    expect(irA).not.toHaveBeenCalled();
  });

  it('[I] con token no despierta al servidor: la validación ya lo hace', () => {
    iniciarConToken('vigente');

    expect(http.match(SALUD)).toHaveLength(0);
    http.expectOne(AUTORIZAR).flush({ usuario: {} });
  });
});
