import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { GraficoBarras } from '../../componentes/grafico-barras/grafico-barras';
import { GraficoLineas } from '../../componentes/grafico-lineas/grafico-lineas';
import { SeccionEstadistica } from '../../componentes/seccion-estadistica/seccion-estadistica';
import {
  ComentariosDePublicacion,
  ComentariosDelDia,
  PublicacionesDeUsuario,
} from '../../interfaces/estadisticas';
import { EstadisticasApi } from '../../servicios/estadisticas/estadisticas';
import { Idioma } from '../../servicios/idioma/idioma';
import { Carga } from '../../utilidades/carga';
import {
  DIAS_MAXIMOS_DEL_RANGO,
  diasDelRango,
  etiquetaDeDia,
  hoyEnBuenosAires,
  sumarDias,
} from '../../utilidades/fechas';
import { acortar } from '../../utilidades/textos';

const DIAS_POR_DEFECTO = 30;
const LETRAS_DEL_TITULO = 30;

@Component({
  imports: [GraficoBarras, GraficoLineas, SeccionEstadistica, TranslatePipe],
  selector: 'app-dashboard-estadisticas',
  templateUrl: './dashboard-estadisticas.html',
})
export class DashboardEstadisticas implements OnInit, OnDestroy {
  private api = inject(EstadisticasApi);
  private idioma = inject(Idioma);

  readonly hasta = signal(hoyEnBuenosAires());
  readonly desde = signal(sumarDias(this.hasta(), 1 - DIAS_POR_DEFECTO));

  readonly publicaciones = new Carga<PublicacionesDeUsuario[]>((filas) => filas.length === 0);
  readonly comentarios = new Carga<ComentariosDelDia[]>((dias) =>
    dias.every((dia) => dia.cantidad === 0),
  );
  readonly ranking = new Carga<ComentariosDePublicacion[]>((filas) => filas.length === 0);

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

  readonly usuarios = computed(() =>
    (this.publicaciones.datos() ?? []).map((f) => `@${f.nombreUsuario}`),
  );
  readonly publicacionesPorUsuario = computed(() =>
    (this.publicaciones.datos() ?? []).map((fila) => fila.cantidad),
  );
  readonly dias = computed(() =>
    (this.comentarios.datos() ?? []).map((dia) =>
      etiquetaDeDia(dia.fecha, this.idioma.actual() ?? undefined),
    ),
  );
  readonly comentariosPorDia = computed(() =>
    (this.comentarios.datos() ?? []).map((dia) => dia.cantidad),
  );
  readonly titulos = computed(() => (this.ranking.datos() ?? []).map((fila) => fila.titulo));
  readonly titulosCortos = computed(() =>
    this.titulos().map((titulo) => acortar(titulo, LETRAS_DEL_TITULO)),
  );
  readonly comentariosPorPublicacion = computed(() =>
    (this.ranking.datos() ?? []).map((fila) => fila.cantidad),
  );

  ngOnInit() {
    this.cargar();
  }

  ngOnDestroy() {
    this.publicaciones.detener();
    this.comentarios.detener();
    this.ranking.detener();
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
    this.cargarPublicaciones();
    this.cargarComentarios();
    this.cargarRanking();
  }

  cargarPublicaciones() {
    this.pedir(this.publicaciones, () =>
      this.api.publicacionesPorUsuario(this.desde(), this.hasta()),
    );
  }

  cargarComentarios() {
    this.pedir(this.comentarios, () => this.api.comentariosPorDia(this.desde(), this.hasta()));
  }

  cargarRanking() {
    this.pedir(this.ranking, () => this.api.comentariosPorPublicacion(this.desde(), this.hasta()));
  }

  private pedir<T>(carga: Carga<T>, origen: () => Observable<T>) {
    if (this.errorDeRango()) {
      carga.detener();
      return;
    }
    carga.cargar(origen());
  }
}
