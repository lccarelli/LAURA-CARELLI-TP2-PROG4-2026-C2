import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { GraficoBarras } from '../../componentes/grafico-barras/grafico-barras';
import { GraficoLineas } from '../../componentes/grafico-lineas/grafico-lineas';
import { GraficoTorta } from '../../componentes/grafico-torta/grafico-torta';
import { Indicador } from '../../componentes/indicador/indicador';
import { SeccionEstadistica } from '../../componentes/seccion-estadistica/seccion-estadistica';
import {
  CantidadDelDia,
  ComentariosDePublicacion,
  ComentariosDelDia,
  IngresosDeUsuario,
  PublicacionesDeTipo,
  PublicacionesDeUsuario,
  ResumenDelRango,
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

const ATAJOS = [
  { dias: 7, clave: 'estadisticas.atajo_7' },
  { dias: 30, clave: 'estadisticas.atajo_30' },
  { dias: 90, clave: 'estadisticas.atajo_90' },
  { dias: 365, clave: 'estadisticas.atajo_365' },
] as const;

@Component({
  imports: [
    GraficoBarras,
    GraficoLineas,
    GraficoTorta,
    Indicador,
    SeccionEstadistica,
    TranslatePipe,
  ],
  selector: 'app-dashboard-estadisticas',
  templateUrl: './dashboard-estadisticas.html',
})
export class DashboardEstadisticas implements OnInit, OnDestroy {
  private api = inject(EstadisticasApi);
  private idioma = inject(Idioma);
  private traductor = inject(TranslateService);

  readonly hasta = signal(hoyEnBuenosAires());
  readonly desde = signal(sumarDias(this.hasta(), 1 - DIAS_POR_DEFECTO));

  readonly atajos = ATAJOS;
  readonly resumen = new Carga<ResumenDelRango>(() => false);
  readonly publicaciones = new Carga<PublicacionesDeUsuario[]>((filas) => filas.length === 0);
  readonly comentarios = new Carga<ComentariosDelDia[]>((dias) =>
    dias.every((dia) => dia.cantidad === 0),
  );
  readonly tipos = new Carga<PublicacionesDeTipo[]>((filas) =>
    filas.every((fila) => fila.cantidad === 0),
  );
  readonly ranking = new Carga<ComentariosDePublicacion[]>((filas) => filas.length === 0);
  readonly ingresos = new Carga<IngresosDeUsuario[]>((filas) => filas.length === 0);
  readonly visitas = new Carga<CantidadDelDia[]>((dias) => dias.every((dia) => dia.cantidad === 0));
  readonly meGusta = new Carga<CantidadDelDia[]>((dias) => dias.every((dia) => dia.cantidad === 0));

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

  readonly atajoActivo = computed(() =>
    this.hasta() === hoyEnBuenosAires() && !this.errorDeRango()
      ? diasDelRango(this.desde(), this.hasta())
      : null,
  );

  readonly notaDelResumen = computed(() => {
    const idioma = this.idioma.actual() ?? undefined;
    const anterior = this.resumen.datos()?.anterior;
    return {
      desde: anterior ? etiquetaDeDia(anterior.desde, idioma) : '',
      hasta: anterior ? etiquetaDeDia(anterior.hasta, idioma) : '',
    };
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

  readonly personasQueIngresaron = computed(() =>
    (this.ingresos.datos() ?? []).map((fila) => `@${fila.nombreUsuario}`),
  );
  readonly ingresosPorPersona = computed(() =>
    (this.ingresos.datos() ?? []).map((fila) => fila.cantidad),
  );
  readonly diasDeVisitas = computed(() => this.etiquetasDeDias(this.visitas.datos()));
  readonly visitasPorDia = computed(() => (this.visitas.datos() ?? []).map((dia) => dia.cantidad));
  readonly diasDeMeGusta = computed(() => this.etiquetasDeDias(this.meGusta.datos()));
  readonly meGustaPorDia = computed(() => (this.meGusta.datos() ?? []).map((dia) => dia.cantidad));

  readonly nombresDeTipos = computed(() => {
    this.idioma.actual();
    return (this.tipos.datos() ?? []).map((fila) => this.traductor.instant(`tipos.${fila.tipo}`));
  });
  readonly publicacionesPorTipo = computed(() =>
    (this.tipos.datos() ?? []).map((fila) => fila.cantidad),
  );

  ngOnInit() {
    this.cargar();
  }

  ngOnDestroy() {
    this.resumen.detener();
    this.publicaciones.detener();
    this.comentarios.detener();
    this.ranking.detener();
    this.tipos.detener();
    this.ingresos.detener();
    this.visitas.detener();
    this.meGusta.detener();
  }

  elegirAtajo(dias: number) {
    const hoy = hoyEnBuenosAires();
    this.hasta.set(hoy);
    this.desde.set(sumarDias(hoy, 1 - dias));
    this.cargar();
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
    this.cargarResumen();
    this.cargarPublicaciones();
    this.cargarComentarios();
    this.cargarRanking();
    this.cargarTipos();
    this.cargarIngresos();
    this.cargarVisitas();
    this.cargarMeGusta();
  }

  cargarResumen() {
    this.pedir(this.resumen, () => this.api.resumen(this.desde(), this.hasta()));
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

  cargarTipos() {
    this.pedir(this.tipos, () => this.api.publicacionesPorTipo(this.desde(), this.hasta()));
  }

  cargarIngresos() {
    this.pedir(this.ingresos, () => this.api.ingresosPorUsuario(this.desde(), this.hasta()));
  }

  cargarVisitas() {
    this.pedir(this.visitas, () => this.api.visitasAMiPerfil(this.desde(), this.hasta()));
  }

  cargarMeGusta() {
    this.pedir(this.meGusta, () => this.api.meGustaPorDia(this.desde(), this.hasta()));
  }

  private etiquetasDeDias(dias: CantidadDelDia[] | null) {
    const idioma = this.idioma.actual() ?? undefined;
    return (dias ?? []).map((dia) => etiquetaDeDia(dia.fecha, idioma));
  }

  private pedir<T>(carga: Carga<T>, origen: () => Observable<T>) {
    if (this.errorDeRango()) {
      carga.detener();
      return;
    }
    carga.cargar(origen());
  }
}
