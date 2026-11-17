import { Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { fromEvent, interval, merge } from 'rxjs';
import { AutoFoco } from '../../directivas/auto-foco/auto-foco';
import { Notificacion } from '../../interfaces/notificacion';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { Auth } from '../../servicios/auth/auth';
import { NotificacionesApi } from '../../servicios/notificaciones/notificaciones';
import { ListadoPaginado } from '../../utilidades/listado-paginado';
import { AvisosDelDispositivo } from '../avisos-del-dispositivo/avisos-del-dispositivo';
import { Aviso } from '../aviso/aviso';
import { AvisosPush } from '../../servicios/avisos-push/avisos-push';
import { Icono } from '../icono/icono';
import { ModalConfirmacion } from '../modal-confirmacion/modal-confirmacion';
import { VerMas } from '../ver-mas/ver-mas';

const ESPERA_ENTRE_CONSULTAS_MS = 30 * 1000;
const MAXIMO_MOSTRADO = 99;

@Component({
  imports: [
    Aviso,
    AvisosDelDispositivo,
    AutoFoco,
    FechaRelativa,
    Icono,
    ModalConfirmacion,
    RouterLink,
    TranslatePipe,
    VerMas,
  ],
  selector: 'app-campanita',
  templateUrl: './campanita.html',
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class Campanita {
  protected auth = inject(Auth);
  private api = inject(NotificacionesApi);
  private avisosPush = inject(AvisosPush);

  readonly cantidad = signal(0);
  readonly abierto = signal(false);
  readonly confirmandoBorrado = signal(false);
  readonly borrando = signal(false);
  readonly listado = new ListadoPaginado<Notificacion>((offset) => this.api.listar(offset));

  constructor() {
    effect(() => {
      if (this.auth.usuario()) {
        this.actualizarCantidad();
        this.avisosPush.iniciar();
      } else {
        this.cantidad.set(0);
        this.abierto.set(false);
      }
    });

    merge(interval(ESPERA_ENTRE_CONSULTAS_MS), fromEvent(document, 'visibilitychange'))
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.actualizarCantidad());
  }

  get cantidadMostrada() {
    return this.cantidad() > MAXIMO_MOSTRADO ? `${MAXIMO_MOSTRADO}+` : String(this.cantidad());
  }

  alternar() {
    if (this.abierto()) {
      this.cerrar();
      return;
    }
    this.abierto.set(true);
    this.listado.reiniciar();
    this.actualizarCantidad();
  }

  cerrar() {
    if (this.abierto() && !this.confirmandoBorrado()) {
      this.listado.cancelar();
      this.abierto.set(false);
    }
  }

  abrirNotificacion(notificacion: Notificacion) {
    this.cerrar();
    if (notificacion.leida) {
      return;
    }
    this.cantidad.update((actual) => Math.max(0, actual - 1));
    this.api.marcarLeida(notificacion._id).subscribe({ error: () => this.actualizarCantidad() });
  }

  marcarTodasLeidas() {
    this.api.marcarTodasLeidas().subscribe(() => {
      this.cantidad.set(0);
      this.listado.items.update((items) => items.map((item) => ({ ...item, leida: true })));
    });
  }

  eliminar(notificacion: Notificacion) {
    this.listado.quitar(notificacion._id);
    if (!notificacion.leida) {
      this.cantidad.update((actual) => Math.max(0, actual - 1));
    }
    this.api.eliminar(notificacion._id).subscribe({
      error: () => {
        this.listado.reiniciar();
        this.actualizarCantidad();
      },
    });
  }

  borrarHistorial() {
    this.borrando.set(true);
    this.api.eliminarTodas().subscribe({
      next: () => {
        this.listado.reiniciar();
        this.cantidad.set(0);
        this.borrando.set(false);
        this.confirmandoBorrado.set(false);
      },
      error: () => {
        this.borrando.set(false);
        this.confirmandoBorrado.set(false);
      },
    });
  }

  private actualizarCantidad() {
    if (!this.auth.usuario() || document.hidden) {
      return;
    }
    this.api.cantidadSinLeer().subscribe({
      next: ({ cantidad }) => this.cantidad.set(cantidad),
    });
  }
}
