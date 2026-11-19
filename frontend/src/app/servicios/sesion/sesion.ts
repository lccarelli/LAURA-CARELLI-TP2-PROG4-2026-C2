import { DestroyRef, computed, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, fromEvent, interval, merge } from 'rxjs';
import { mensajeDeApi } from '../../utilidades/errores';
import { Auth } from '../auth/auth';

const PASO_MS = 1000;
export const SEGUNDOS_DE_AVISO = 5 * 60;
const ESPERA_ENTRE_RENOVACIONES_MS = 30 * 1000;

@Service()
export class Sesion {
  private auth = inject(Auth);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private ahora = signal(Date.now());
  private ultimaActividad: number | null = null;
  private ultimaRenovacion = 0;
  readonly verificando = signal(false);
  readonly extendiendo = signal(false);

  readonly segundosRestantes = computed(() => {
    const vencimiento = this.auth.vencimiento();
    return vencimiento === null
      ? null
      : Math.max(0, Math.ceil((vencimiento - this.ahora()) / 1000));
  });

  readonly segundosDeAviso = computed(() => {
    const duracion = this.auth.duracion();
    return duracion === null ? SEGUNDOS_DE_AVISO : duracion / 3;
  });

  readonly avisando = computed(() => {
    const segundos = this.segundosRestantes();
    return segundos !== null && segundos > 0 && segundos <= this.segundosDeAviso();
  });

  iniciar() {
    this.verificar();

    interval(PASO_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pasar());

    merge(
      fromEvent(document, 'pointerdown'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'input'),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => (this.ultimaActividad = Date.now()));

    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible') {
          this.pasar();
        }
      });
  }

  extender() {
    if (this.extendiendo()) {
      return;
    }

    this.extendiendo.set(true);
    this.auth
      .refrescar()
      .pipe(finalize(() => this.extendiendo.set(false)))
      .subscribe({
        next: () => this.ahora.set(Date.now()),
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.auth.salir(mensajeDeApi(error));
            this.router.navigateByUrl('/login');
          }
        },
      });
  }

  cerrar() {
    this.auth.salir();
    this.router.navigateByUrl('/login');
  }

  private pasar() {
    this.ahora.set(Date.now());
    if (this.redirectALoginConTokenBorrado()) {
      return;
    }

    if (this.segundosRestantes() === 0) {
      this.auth.salir('api.SESION_VENCIDA');
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.avisando() && this.hayActividadReciente() && this.puedeRenovar()) {
      this.ultimaRenovacion = Date.now();
      this.extender();
    }
  }

  private hayActividadReciente() {
    return (
      this.ultimaActividad !== null &&
      this.ahora() - this.ultimaActividad < this.segundosDeAviso() * 1000
    );
  }

  private puedeRenovar() {
    return this.ahora() - this.ultimaRenovacion >= ESPERA_ENTRE_RENOVACIONES_MS;
  }

  private redirectALoginConTokenBorrado() {
    const habiaSesion = this.auth.token() !== null;
    this.auth.sincronizar();
    if (habiaSesion && this.auth.token() === null) {
      this.router.navigateByUrl('/login');
      return true;
    }
    return false;
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
      .subscribe({ error: () => undefined });
  }
}
