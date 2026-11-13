import { DestroyRef, computed, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { mensajeDeApi } from '../../utilidades/errores';
import { Auth } from '../auth/auth';

const PASO_MS = 1000;
export const SEGUNDOS_DE_AVISO = 5 * 60;

@Service()
export class Sesion {
  private auth = inject(Auth);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private ahora = signal(Date.now());
  readonly verificando = signal(false);
  readonly extendiendo = signal(false);

  readonly segundosRestantes = computed(() => {
    const vencimiento = this.auth.vencimiento();
    return vencimiento === null
      ? null
      : Math.max(0, Math.ceil((vencimiento - this.ahora()) / 1000));
  });

  readonly avisando = computed(() => {
    const segundos = this.segundosRestantes();
    return segundos !== null && segundos > 0 && segundos <= SEGUNDOS_DE_AVISO;
  });

  iniciar() {
    this.verificar();

    interval(PASO_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pasar());
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
    }
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
