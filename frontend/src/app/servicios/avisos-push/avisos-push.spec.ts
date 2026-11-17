import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import {
  ENDPOINT_DE_PRUEBA,
  proveerSwPushDePrueba,
  suscripcionDePrueba,
  swPushFalso,
} from '../../../testing/push';
import { Instalacion } from '../instalacion/instalacion';
import { AvisosPush } from './avisos-push';

const URL = `${environment.API_URL}/push`;

describe('AvisosPush', () => {
  let http: HttpTestingController;
  let push: ReturnType<typeof swPushFalso>;

  const preparar = (falso = swPushFalso(), permiso: NotificationPermission = 'default') => {
    push = falso;
    vi.stubGlobal('Notification', { permission: permiso });
    TestBed.configureTestingModule({
      providers: [
        proveerIdiomaDePrueba(),
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerSwPushDePrueba(push),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AvisosPush);
  };
  const iniciar = async (avisos: AvisosPush, clave: string | null = 'clave-vapid') => {
    const inicio = avisos.iniciar();
    await Promise.resolve();
    http.expectOne({ method: 'GET', url: `${URL}/clave-publica` }).flush({ clavePublica: clave });
    await inicio;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('[O] con claves y sin suscripción queda listo para activar', async () => {
    const avisos = preparar();

    await iniciar(avisos);

    expect(avisos.estado()).toBe('inactivo');
  });

  it('[E] sin claves en el servidor no se ofrecen', async () => {
    const avisos = preparar();

    await iniciar(avisos, null);

    expect(avisos.estado()).toBe('no-disponible');
  });

  it('[E] con el service worker apagado no se ofrecen ni se pregunta nada al servidor', async () => {
    const avisos = preparar(swPushFalso(false));

    await avisos.iniciar();

    expect(avisos.estado()).toBe('no-disponible');
    http.expectNone(`${URL}/clave-publica`);
  });

  it('[S] el permiso denegado se muestra como bloqueado', async () => {
    const avisos = preparar(swPushFalso(), 'denied');

    await iniciar(avisos);

    expect(avisos.estado()).toBe('bloqueado');
  });

  it('[S] activar pide la suscripción con la clave del servidor y la registra con el idioma', async () => {
    const avisos = preparar();
    await iniciar(avisos);

    const activacion = avisos.activar();
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'POST', url: `${URL}/suscripciones` })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await activacion;

    expect(push.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: 'clave-vapid' });
    expect(avisos.estado()).toBe('activo');
  });

  it('[O] el registro lleva el endpoint, las claves y el idioma', async () => {
    const avisos = preparar();
    await iniciar(avisos);

    const activacion = avisos.activar();
    let cuerpo: unknown;
    await vi.waitFor(() => {
      const pedido = http.expectOne({ method: 'POST', url: `${URL}/suscripciones` });
      cuerpo = pedido.request.body;
      pedido.flush(null, { status: 204, statusText: 'No Content' });
    });
    await activacion;

    expect(cuerpo).toEqual({
      endpoint: ENDPOINT_DE_PRUEBA,
      keys: { p256dh: 'p256dh-x', auth: 'auth-x' },
      idioma: 'es',
    });
  });

  it('[E] si el permiso se deniega al activar, queda bloqueado y sin error genérico', async () => {
    const avisos = preparar();
    await iniciar(avisos);
    push.requestSubscription.mockImplementation(async () => {
      vi.stubGlobal('Notification', { permission: 'denied' });
      throw new Error('denegado');
    });

    await avisos.activar();

    expect(avisos.estado()).toBe('bloqueado');
    expect(avisos.fallo()).toBe(false);
  });

  it('[E] si falla por otro motivo, muestra el error y sigue inactivo', async () => {
    const avisos = preparar();
    await iniciar(avisos);
    push.requestSubscription.mockRejectedValue(new Error('sin red'));

    await avisos.activar();

    expect(avisos.estado()).toBe('inactivo');
    expect(avisos.fallo()).toBe(true);
  });

  it('[S] con una suscripción existente, la vuelve a registrar y queda activo', async () => {
    const avisos = preparar(swPushFalso(true, suscripcionDePrueba()));

    const inicio = avisos.iniciar();
    await Promise.resolve();
    http.expectOne({ method: 'GET', url: `${URL}/clave-publica` }).flush({ clavePublica: 'k' });
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'POST', url: `${URL}/suscripciones` })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await inicio;

    expect(avisos.estado()).toBe('activo');
  });

  it('[S] desactivar borra la suscripción del navegador y del servidor', async () => {
    const avisos = preparar(swPushFalso(true, suscripcionDePrueba()));
    const inicio = avisos.iniciar();
    await Promise.resolve();
    http.expectOne(`${URL}/clave-publica`).flush({ clavePublica: 'k' });
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'POST', url: `${URL}/suscripciones` })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await inicio;

    const baja = avisos.desactivar();
    await vi.waitFor(() => {
      const pedido = http.expectOne({ method: 'DELETE', url: `${URL}/suscripciones` });
      expect(pedido.request.body).toEqual({ endpoint: ENDPOINT_DE_PRUEBA });
      pedido.flush(null, { status: 204, statusText: 'No Content' });
    });
    await baja;

    expect(push.unsubscribe).toHaveBeenCalledTimes(1);
    expect(avisos.estado()).toBe('inactivo');
  });

  it('[S] desvincular quita al servidor la suscripción de este dispositivo', async () => {
    const avisos = preparar(swPushFalso(true, suscripcionDePrueba()));
    const inicio = avisos.iniciar();
    await Promise.resolve();
    http.expectOne(`${URL}/clave-publica`).flush({ clavePublica: 'k' });
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'POST', url: `${URL}/suscripciones` })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await inicio;

    const baja = avisos.desvincular();
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'DELETE', url: `${URL}/suscripciones` })
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await baja;

    expect(push.unsubscribe).not.toHaveBeenCalled();
    expect(avisos.activo()).toBe(false);
  });

  it('[B] desvincular sin avisos activos no hace nada', async () => {
    const avisos = preparar();

    await avisos.desvincular();

    http.expectNone(`${URL}/suscripciones`);
    expect(avisos.activo()).toBe(false);
  });

  it('[S] en iPhone sin instalar pide instalar la app antes de ofrecer los avisos', async () => {
    const avisos = preparar();
    Object.assign(TestBed.inject(Instalacion), { esIos: true });
    TestBed.inject(Instalacion).instalada.set(false);

    expect(avisos.estado()).toBe('instalar');
  });
});
