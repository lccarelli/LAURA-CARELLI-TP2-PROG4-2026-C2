import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Aviso } from '../../componentes/aviso/aviso';
import { CubreplatoLoading } from '../../componentes/cubreplato-loading/cubreplato-loading';
import { GraficoBarras } from '../../componentes/grafico-barras/grafico-barras';
import { PublicacionesDeUsuario } from '../../interfaces/estadisticas';
import { EstadisticasApi } from '../../servicios/estadisticas/estadisticas';
import { mensajeDeApi } from '../../utilidades/errores';
import {
  DIAS_MAXIMOS_DEL_RANGO,
  diasDelRango,
  hoyEnBuenosAires,
  sumarDias,
} from '../../utilidades/fechas';

const DIAS_POR_DEFECTO = 30;

@Component({
  imports: [Aviso, CubreplatoLoading, GraficoBarras, TranslatePipe],
  selector: 'app-dashboard-estadisticas',
  templateUrl: './dashboard-estadisticas.html',
})
export class DashboardEstadisticas implements OnInit, OnDestroy {
  private api = inject(EstadisticasApi);
  private pedido?: Subscription;

  readonly hasta = signal(hoyEnBuenosAires());
  readonly desde = signal(sumarDias(this.hasta(), 1 - DIAS_POR_DEFECTO));
  readonly datos = signal<PublicacionesDeUsuario[] | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  readonly errorDeRango = computed(() => {
    const desde = this.desde();
    const hasta = this.hasta();
    if (!desde || !hasta) {
      return 'estadisticas.rango_incompleto';
    }
    if (desde > hasta) {
      return 'estadisticas.rango_invalido';
    }
    return diasDelRango(desde, hasta) > DIAS_MAXIMOS_DEL_RANGO ? 'estadisticas.rango_largo' : null;
  });
  readonly etiquetas = computed(() => this.datos()?.map((fila) => `@${fila.nombreUsuario}`) ?? []);
  readonly valores = computed(() => this.datos()?.map((fila) => fila.cantidad) ?? []);

  ngOnInit() {
    this.cargar();
  }

  ngOnDestroy() {
    this.pedido?.unsubscribe();
  }

  cambiarDesde(valor: string) {
    this.desde.set(valor);
    this.cargar();
  }

  cambiarHasta(valor: string) {
    this.hasta.set(valor);
    this.cargar();
  }

  cargar() {
    this.pedido?.unsubscribe();
    if (this.errorDeRango()) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);
    this.pedido = this.api.publicacionesPorUsuario(this.desde(), this.hasta()).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.mensajeError.set(mensajeDeApi(error));
        this.cargando.set(false);
      },
    });
  }
}
