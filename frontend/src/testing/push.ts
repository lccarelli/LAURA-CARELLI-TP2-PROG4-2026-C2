import { SwPush } from '@angular/service-worker';
import { BehaviorSubject } from 'rxjs';

export const ENDPOINT_DE_PRUEBA = 'https://push.prueba.test/dispositivo';

export const suscripcionDePrueba = () =>
  ({
    endpoint: ENDPOINT_DE_PRUEBA,
    toJSON: () => ({ endpoint: ENDPOINT_DE_PRUEBA, keys: { p256dh: 'p256dh-x', auth: 'auth-x' } }),
  }) as unknown as PushSubscription;

export const swPushFalso = (habilitado = true, suscripcion: PushSubscription | null = null) => {
  const actual = new BehaviorSubject<PushSubscription | null>(suscripcion);
  return {
    isEnabled: habilitado,
    subscription: actual,
    requestSubscription: vi.fn(async () => {
      const nueva = suscripcionDePrueba();
      actual.next(nueva);
      return nueva;
    }),
    unsubscribe: vi.fn(async () => actual.next(null)),
  };
};

export const proveerSwPushDePrueba = (falso: ReturnType<typeof swPushFalso>) => ({
  provide: SwPush,
  useValue: falso,
});
