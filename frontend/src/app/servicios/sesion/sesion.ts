import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { Auth } from '../auth/auth';

const REVISION_MS = 60 * 1000;
const EVENTOS_DE_ACTIVIDAD = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

@Service()
export class Sesion {
  private auth = inject(Auth);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly verificando = signal(false);
  private ultimaActividad = -1;
  private ultimaRenovacion = 0;

  iniciar() {
    const marcar = () => {
      this.ultimaActividad = Date.now();
    };
    for (const evento of EVENTOS_DE_ACTIVIDAD) {
      document.addEventListener(evento, marcar, { capture: true, passive: true });
    }
    this.destroyRef.onDestroy(() => {
      for (const evento of EVENTOS_DE_ACTIVIDAD) {
        document.removeEventListener(evento, marcar, { capture: true });
      }
    });

    this.verificar();

    interval(REVISION_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revisar());
  }

  private verificar() {
    if (!this.auth.token()) {
      this.auth.despertarServidor().subscribe({ error: () => undefined });
      return;
    }

    this.verificando.set(true);
    this.auth
      .autorizar()
      .pipe(finalize(() => this.verificando.set(false)))
      .subscribe({
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.auth.salir();
            this.router.navigateByUrl('/login');
          }
        },
      });
  }

  revisar() {
    if (!this.auth.token() || this.ultimaActividad < this.ultimaRenovacion) {
      return;
    }

    const anterior = this.ultimaRenovacion;
    this.ultimaRenovacion = Date.now();
    this.auth.refrescar().subscribe({
      error: (error: HttpErrorResponse) => {
        if (error.status !== 401) {
          this.ultimaRenovacion = anterior;
        }
      },
    });
  }
}
