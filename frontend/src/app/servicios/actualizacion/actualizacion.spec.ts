import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { Actualizacion } from './actualizacion';

describe('Actualizacion', () => {
  const eventos = new Subject<VersionEvent>();
  const activar = vi.fn(() => Promise.resolve(true));
  const recargar = vi.fn();

  const crear = (conServiceWorker = true) => {
    TestBed.configureTestingModule({
      providers: [
        ...(conServiceWorker
          ? [{ provide: SwUpdate, useValue: { versionUpdates: eventos, activateUpdate: activar } }]
          : []),
        { provide: DOCUMENT, useValue: { location: { reload: recargar } } },
      ],
    });
    return TestBed.inject(Actualizacion);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Z] al abrir no hay ninguna versión nueva', () => {
    expect(crear().hayNueva()).toBe(false);
  });

  it('[O] cuando el service worker baja una versión nueva, lo avisa', () => {
    const servicio = crear();

    eventos.next({ type: 'VERSION_READY' } as VersionEvent);

    expect(servicio.hayNueva()).toBe(true);
  });

  it.each(['VERSION_DETECTED', 'NO_NEW_VERSION_DETECTED', 'VERSION_INSTALLATION_FAILED'])(
    '[S] el evento %s no se avisa como versión nueva',
    (tipo) => {
      const servicio = crear();

      eventos.next({ type: tipo } as VersionEvent);

      expect(servicio.hayNueva()).toBe(false);
    },
  );

  it('[O] aplicar activa la versión nueva y recarga la página, en ese orden', async () => {
    const orden: string[] = [];
    activar.mockImplementationOnce(() => {
      orden.push('activar');
      return Promise.resolve(true);
    });
    recargar.mockImplementationOnce(() => orden.push('recargar'));

    await crear().aplicar();

    expect(orden).toEqual(['activar', 'recargar']);
  });

  it('[E] sin service worker (desarrollo o navegador sin soporte) no falla y nunca avisa', async () => {
    const servicio = crear(false);

    await servicio.aplicar();

    expect(servicio.hayNueva()).toBe(false);
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
