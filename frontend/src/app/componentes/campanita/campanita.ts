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
import { Aviso } from '../aviso/aviso';
import { CubreplatoLoading } from '../cubreplato-loading/cubreplato-loading';
import { Icono } from '../icono/icono';
import { VerMas } from '../ver-mas/ver-mas';

const ESPERA_ENTRE_CONSULTAS_MS = 30 * 1000;
const MAXIMO_MOSTRADO = 99;

@Component({
  imports: [
    Aviso,
    AutoFoco,
    CubreplatoLoading,
    FechaRelativa,
    Icono,
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

  readonly cantidad = signal(0);
  readonly abierto = signal(false);
  readonly listado = new ListadoPaginado<Notificacion>((offset) => this.api.listar(offset));

  constructor() {
    effect(() => {
      if (this.auth.usuario()) {
        this.actualizarCantidad();
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
    if (this.abierto()) {
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

  private actualizarCantidad() {
    if (!this.auth.usuario() || document.hidden) {
      return;
    }
    this.api.cantidadSinLeer().subscribe({
      next: ({ cantidad }) => this.cantidad.set(cantidad),
    });
  }
}
