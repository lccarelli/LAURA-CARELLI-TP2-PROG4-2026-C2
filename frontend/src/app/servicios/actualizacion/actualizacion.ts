import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

@Service()
export class Actualizacion {
  private actualizaciones = inject(SwUpdate, { optional: true });
  private documento = inject(DOCUMENT);

  readonly hayNueva = signal(false);

  constructor() {
    this.actualizaciones?.versionUpdates
      .pipe(
        filter((evento) => evento.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.hayNueva.set(true));
  }

  async aplicar() {
    await this.actualizaciones?.activateUpdate();
    this.documento.location.reload();
  }
}
