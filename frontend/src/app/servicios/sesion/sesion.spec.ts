import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sesionVencidaInterceptor } from '../../interceptores/sesion-vencida-interceptor';
import { tokenInterceptor } from '../../interceptores/token-interceptor';
import { tokenConDuracion, tokenQueVenceEn } from '../../../testing/token';
import { Auth } from '../auth/auth';
import { SEGUNDOS_DE_AVISO, Sesion } from './sesion';

const REFRESCAR = `${environment.API_URL}/auth/refrescar`;
const MINUTO = 60 * 1000;
const SEGUNDO = 1000;

describe('Sesion: vencimiento del token', () => {
  let http: HttpTestingController;
  let auth: Auth;
  let sesion: Sesion;
  let irA: ReturnType<typeof vi.spyOn>;

  const crearToken = (segundos: number | null, duracion?: number) => {
    if (segundos === null) {
      return null;
    }
    return duracion ? tokenConDuracion(duracion) : tokenQueVenceEn(segundos);
  };
  const iniciarConToken = (segundos: number | null, duracion?: number) => {
    const token = crearToken(segundos, duracion);
    if (token) {
      localStorage.setItem('token', token);
    }
    auth.token.set(token);
    sesion.iniciar();
    http.match(`${environment.API_URL}/auth/autorizar`);
  };
  const avanzar = (ms: number) => vi.advanceTimersByTime(ms);
  const pedidos = () => http.match(REFRESCAR);

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    sesion = TestBed.inject(Sesion);
    irA = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('[Z] sin sesión iniciada nunca avisa ni cierra nada', () => {
    iniciarConToken(null);

    avanzar(60 * MINUTO);

    expect(sesion.avisando()).toBe(false);
    expect(sesion.segundosRestantes()).toBeNull();
    expect(irA).not.toHaveBeenCalled();
  });

  it('[O] con el token recién emitido (15 minutos) no avisa', () => {
    iniciarConToken(15 * 60);

    expect(sesion.avisando()).toBe(false);
    expect(sesion.segundosRestantes()).toBe(15 * 60);
  });

  it('[O] a los 10 minutos de emitido el token avisa', () => {
    iniciarConToken(15 * 60);

    avanzar(10 * MINUTO - SEGUNDO);
    expect(sesion.avisando()).toBe(false);

    avanzar(SEGUNDO);
    expect(sesion.avisando()).toBe(true);
    expect(sesion.segundosRestantes()).toBe(SEGUNDOS_DE_AVISO);
  });

  describe('con un token de otra duración (JWT_EXPIRA)', () => {
    it('[O] un token de 2 minutos avisa cuando falta un tercio, a los 80 segundos', () => {
      iniciarConToken(120, 120);

      avanzar(79 * SEGUNDO);
      expect(sesion.avisando()).toBe(false);

      avanzar(SEGUNDO);
      expect(sesion.avisando()).toBe(true);
      expect(sesion.segundosDeAviso()).toBe(40);
    });

    it('[O] con actividad en el último tercio renueva solo', () => {
      iniciarConToken(120, 120);
      avanzar(79 * SEGUNDO);
      document.dispatchEvent(new Event('pointerdown'));

      avanzar(SEGUNDO);

      expect(pedidos()).toHaveLength(1);
    });

    it('[S] la actividad de hace más de un tercio no cuenta: el aviso espera a la persona', () => {
      iniciarConToken(120, 120);
      document.dispatchEvent(new Event('pointerdown'));

      avanzar(100 * SEGUNDO);

      expect(sesion.avisando()).toBe(true);
      expect(pedidos()).toHaveLength(0);
    });

    it('[B] sin fecha de emisión en el token mantiene los 5 minutos de siempre', () => {
      iniciarConToken(15 * 60);

      expect(sesion.segundosDeAviso()).toBe(SEGUNDOS_DE_AVISO);
    });

    it('[B] un token de 15 minutos con fecha de emisión avisa a los 5 minutos', () => {
      iniciarConToken(15 * 60, 15 * 60);

      expect(sesion.segundosDeAviso()).toBe(SEGUNDOS_DE_AVISO);
    });
  });

  it('[S] sin actividad reciente el aviso no pide nada solo', () => {
    iniciarConToken(15 * 60);

    document.dispatchEvent(new Event('pointerdown'));
    avanzar(11 * MINUTO);

    expect(sesion.avisando()).toBe(true);
    expect(pedidos()).toHaveLength(0);
  });

  it.each(['pointerdown', 'keydown', 'input'])(
    '[O] con actividad (%s) renueva el token solo al entrar en el aviso',
    (evento) => {
      iniciarConToken(15 * 60);
      avanzar(10 * MINUTO - SEGUNDO);
      document.dispatchEvent(new Event(evento));

      avanzar(SEGUNDO);

      const [pedido] = pedidos();
      expect(pedido.request.method).toBe('POST');
      pedido.flush({ token: tokenQueVenceEn(15 * 60) });
      expect(sesion.avisando()).toBe(false);
    },
  );

  it('[S] si la renovación automática falla, espera 30 segundos antes de reintentar', () => {
    iniciarConToken(15 * 60);
    avanzar(10 * MINUTO - SEGUNDO);
    document.dispatchEvent(new Event('input'));
    avanzar(SEGUNDO);
    pedidos()[0].flush(null, { status: 0, statusText: 'sin red' });

    avanzar(29 * SEGUNDO);
    expect(pedidos()).toHaveLength(0);

    avanzar(SEGUNDO);
    expect(pedidos()).toHaveLength(1);
  });

  it('[O] al volver a la app con el token vencido cierra la sesión sin esperar al reloj', () => {
    iniciarConToken(15 * 60);
    vi.setSystemTime(Date.now() + 16 * MINUTO);

    document.dispatchEvent(new Event('visibilitychange'));

    expect(auth.token()).toBeNull();
    expect(auth.motivoDeSalida()).toBe('api.SESION_VENCIDA');
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('[I] al cargar con un token que ya está por vencer, avisa enseguida', () => {
    iniciarConToken(3 * 60);

    avanzar(SEGUNDO);

    expect(sesion.avisando()).toBe(true);
  });

  it('[B] cuando llega a cero cierra la sesión y lleva al login con el motivo', () => {
    iniciarConToken(15 * 60);

    avanzar(15 * MINUTO);

    expect(sesion.avisando()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(auth.motivoDeSalida()).toBe('api.SESION_VENCIDA');
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('[B] un segundo antes de vencer todavía no cierra la sesión', () => {
    iniciarConToken(15 * 60);

    avanzar(15 * MINUTO - SEGUNDO);

    expect(auth.token()).not.toBeNull();
    expect(irA).not.toHaveBeenCalled();
  });

  it('[O] extender pide un token nuevo, lo guarda y el aviso se cierra', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);
    const nuevo = tokenQueVenceEn(15 * 60);

    sesion.extender();
    const [pedido] = pedidos();
    expect(sesion.extendiendo()).toBe(true);
    pedido.flush({ token: nuevo });

    expect(pedido.request.method).toBe('POST');
    expect(auth.token()).toBe(nuevo);
    expect(sesion.extendiendo()).toBe(false);
    expect(sesion.avisando()).toBe(false);
  });

  it('[S] extender dos veces seguidas pide un solo token', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);

    sesion.extender();
    sesion.extender();

    expect(pedidos()).toHaveLength(1);
  });

  it('[S] después de extender vuelve a avisar a los 10 minutos del token nuevo', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);
    sesion.extender();
    pedidos()[0].flush({ token: tokenQueVenceEn(15 * 60) });

    avanzar(9 * MINUTO);
    expect(sesion.avisando()).toBe(false);

    avanzar(MINUTO + SEGUNDO);
    expect(sesion.avisando()).toBe(true);
  });

  it('[E] si falla la red al extender, el aviso sigue y se puede reintentar', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);

    sesion.extender();
    pedidos()[0].error(new ProgressEvent('error'));

    expect(sesion.extendiendo()).toBe(false);
    expect(sesion.avisando()).toBe(true);
    sesion.extender();
    expect(pedidos()).toHaveLength(1);
  });

  it('[E] si el token ya no sirve al extender (401), no queda extendiendo', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);

    sesion.extender();
    pedidos()[0].flush({ codigo: 'SESION_VENCIDA' }, { status: 401, statusText: 'Unauthorized' });

    expect(sesion.extendiendo()).toBe(false);
  });

  it('[E] si la cuenta fue deshabilitada (401 USUARIO_NO_AUTORIZADO) cierra la sesión con ese motivo', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);

    sesion.extender();
    pedidos()[0].flush(
      { codigo: 'USUARIO_NO_AUTORIZADO' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(auth.token()).toBeNull();
    expect(auth.motivoDeSalida()).toBe('api.USUARIO_NO_AUTORIZADO');
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('[E] si el servidor falla al extender (500) no cierra la sesión', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);

    sesion.extender();
    pedidos()[0].flush({}, { status: 500, statusText: 'Error' });

    expect(auth.token()).not.toBeNull();
    expect(irA).not.toHaveBeenCalled();
  });

  it('[O] cerrar la sesión desde el aviso borra el token y lleva al login', () => {
    iniciarConToken(15 * 60);
    avanzar(11 * MINUTO);

    sesion.cerrar();

    expect(auth.token()).toBeNull();
    expect(auth.motivoDeSalida()).toBeNull();
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('[O] si se borra el token del almacenamiento, al segundo siguiente cierra la sesión y lleva al login', () => {
    iniciarConToken(15 * 60);

    localStorage.removeItem('token');
    avanzar(SEGUNDO);

    expect(auth.token()).toBeNull();
    expect(auth.motivoDeSalida()).toBeNull();
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('[S] si otra pestaña refresca el token, lo adopta y la sesión sigue', () => {
    iniciarConToken(4 * 60);
    avanzar(SEGUNDO);
    expect(sesion.avisando()).toBe(true);
    const nuevo = tokenQueVenceEn(15 * 60);

    localStorage.setItem('token', nuevo);
    avanzar(SEGUNDO);

    expect(auth.token()).toBe(nuevo);
    expect(sesion.avisando()).toBe(false);
    expect(irA).not.toHaveBeenCalled();
  });

  it('[E] si el almacenamiento deja de estar disponible, la sesión sigue en memoria', () => {
    iniciarConToken(15 * 60);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    avanzar(5 * SEGUNDO);

    expect(auth.token()).not.toBeNull();
    expect(irA).not.toHaveBeenCalled();
  });

  it('[I] al cerrarse el servicio deja de contar el tiempo', () => {
    iniciarConToken(15 * 60);
    TestBed.resetTestingModule();

    avanzar(20 * MINUTO);

    expect(irA).not.toHaveBeenCalled();
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
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor, sesionVencidaInterceptor])),
        provideHttpClientTesting(),
      ],
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
