import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime, interval, merge, skip } from 'rxjs';
import { Aviso } from '../../componentes/aviso/aviso';
import {
  Ingrediente,
  Tipo,
  TipoRinde,
  TIPOS,
  TIPOS_RINDE,
  Unidad,
  UNIDADES,
} from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { Borrador, BorradorPublicacion } from '../../servicios/borrador/borrador';
import { FotosBorrador } from '../../servicios/fotos-borrador/fotos-borrador';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { validarImagen } from '../../utilidades/imagen';

const MAXIMO_INGREDIENTES = 40;
const MAXIMO_PASOS = 40;
const MAXIMO_FOTOS_PASOS = 20;
const MAXIMO_FOTOS_POR_PASO = 5;
const MAXIMO_TEXTO_PASO = 2000;
const MAXIMO_TITULO_PASO = 80;
const UNIDADES_CON_FRACCION: readonly Unidad[] = [
  'kg',
  'l',
  'taza',
  'cucharada',
  'cucharadita',
  'unidad',
];
const LIMITES_FICHA = { porciones: 100, tiempoMinutos: 10080, calorias: 10000 } as const;
const COSTOS = [1, 2, 3, 4] as const;
const CAMPOS_FICHA = ['porciones', 'tiempoMinutos', 'calorias'] as const;
const INTERVALO_RENOVACION_MS = 5 * 60 * 1000;
const ESPERA_AUTOGUARDADO_MS = 800;
const EJEMPLOS_FICHA = { porciones: 4, tiempoMinutos: 30, calorias: 250 } as const;
const PASOS_FICHA = { porciones: 1, tiempoMinutos: 5, calorias: 50 } as const;
const CAMPOS_CONTADOR = ['porciones', 'calorias'] as const;
const TIEMPOS_RAPIDOS = [15, 30, 45, 60, 90, 120] as const;
const PASO_CANTIDAD: Record<Unidad, number> = {
  g: 50,
  kg: 0.5,
  ml: 50,
  l: 0.5,
  taza: 0.25,
  cucharada: 0.5,
  cucharadita: 0.5,
  unidad: 1,
  pizca: 1,
  a_gusto: 1,
};
const FRACCIONES = [
  { texto: '¼', valor: 0.25 },
  { texto: '½', valor: 0.5 },
  { texto: '¾', valor: 0.75 },
] as const;

const redondear = (numero: number) => Math.round(numero * 100) / 100;

interface FotoElegida {
  archivo: File;
  url: string;
}

type PasoForm = FormGroup<{
  titulo: FormControl<string>;
  texto: FormControl<string>;
}>;

type FilaIngrediente = FormGroup<{
  cantidad: FormControl<number | null>;
  unidad: FormControl<Unidad>;
  nombre: FormControl<string>;
}>;

function ingredienteCompleto(control: AbstractControl): ValidationErrors | null {
  const { nombre, cantidad, unidad } = (control as FilaIngrediente).getRawValue();
  const sinNombre = !nombre.trim();
  const sinCantidad = cantidad === null && unidad !== 'a_gusto';
  if (sinNombre && cantidad === null) {
    return null;
  }
  if (sinNombre) {
    return { incompleto: { falta: 'nombre' } };
  }
  return sinCantidad ? { incompleto: { falta: 'cantidad' } } : null;
}

@Component({
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    Aviso,
    TranslatePipe,
  ],
  selector: 'app-nueva-publicacion',
  templateUrl: './nueva-publicacion.html',
  host: {
    '(document:visibilitychange)': 'alCambiarVisibilidad()',
    '(window:beforeunload)': 'guardarBorrador()',
  },
})
export class NuevaPublicacion implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private borrador = inject(Borrador);
  private fotosBorrador = inject(FotosBorrador);
  private publicado = false;
  private hayFotosGuardadas = false;

  private api = inject(PublicacionesApi);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private traductor = inject(TranslateService);

  readonly publicando = signal(false);
  readonly tipos = TIPOS;
  readonly unidades = UNIDADES;
  readonly maximoIngredientes = MAXIMO_INGREDIENTES;
  readonly maximoPasos = MAXIMO_PASOS;
  readonly maximoFotosPasos = MAXIMO_FOTOS_PASOS;
  readonly maximoFotosPorPaso = MAXIMO_FOTOS_POR_PASO;
  readonly maximoTextoPaso = MAXIMO_TEXTO_PASO;
  readonly tiposRinde = TIPOS_RINDE;
  readonly tipoRinde = signal<TipoRinde>('porciones');
  readonly fotosPasos = signal(new Map<AbstractControl, FotoElegida[]>());
  readonly erroresFotoPaso = signal(new Map<AbstractControl, string>());
  readonly costos = COSTOS;
  readonly camposFicha = CAMPOS_FICHA;
  readonly ejemplosFicha = EJEMPLOS_FICHA;
  readonly camposContador = CAMPOS_CONTADOR;
  readonly tiemposRapidos = TIEMPOS_RAPIDOS;
  readonly fracciones = FRACCIONES;
  readonly intentoDePublicar = signal(false);
  readonly costo = signal<number | null>(null);
  readonly tipo = signal<Tipo>('receta');
  readonly imagen = signal<File | null>(null);
  readonly vistaPortada = signal<string | null>(null);
  readonly errorImagen = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly avisoSesion = signal<string | null>(null);
  readonly borradorRecuperado = signal<string | null>(null);
  readonly guardadoEn = signal<string | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(55)]],
    mensaje: ['', [Validators.required, Validators.maxLength(2000)]],
    ingredientes: this.formBuilder.array([this.nuevoIngrediente()]),
    pasos: this.formBuilder.array([this.nuevoPaso()]),
    porciones: this.numeroOpcional(LIMITES_FICHA.porciones),
    tiempoMinutos: this.numeroOpcional(LIMITES_FICHA.tiempoMinutos),
    calorias: this.numeroOpcional(LIMITES_FICHA.calorias),
  });

  constructor() {
    const guardado = this.borrador.leer();
    if (guardado) {
      this.restaurar(guardado);
      this.borradorRecuperado.set(guardado.guardadoEn);
      this.guardadoEn.set(guardado.guardadoEn);
      this.hayFotosGuardadas = guardado.conFotos;
    }

    merge(
      this.formulario.valueChanges,
      toObservable(this.tipo).pipe(skip(1)),
      toObservable(this.costo).pipe(skip(1)),
      toObservable(this.tipoRinde).pipe(skip(1)),
      toObservable(this.imagen).pipe(skip(1)),
      toObservable(this.fotosPasos).pipe(skip(1)),
    )
      .pipe(debounceTime(ESPERA_AUTOGUARDADO_MS), takeUntilDestroyed())
      .subscribe(() => this.guardarBorrador());

    this.renovarSesion();
    interval(INTERVALO_RENOVACION_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.renovarSesion());
  }

  ngOnInit() {
    if (this.hayFotosGuardadas) {
      void this.restaurarFotos();
    }
  }

  ngOnDestroy() {
    this.guardarBorrador();
    this.soltarFotosDePasos();
    this.soltarPortada();
  }

  fotosDe(paso: AbstractControl): FotoElegida[] {
    return this.fotosPasos().get(paso) ?? [];
  }

  errorFotoDe(paso: AbstractControl) {
    return this.erroresFotoPaso().get(paso);
  }

  puedeAgregarFoto(paso: AbstractControl) {
    return this.fotosDe(paso).length < MAXIMO_FOTOS_POR_PASO;
  }

  private totalFotosDePasos() {
    let total = 0;
    this.fotosPasos().forEach((fotos) => (total += fotos.length));
    return total;
  }

  agregarFotosPaso(paso: AbstractControl, evento: Event) {
    const entrada = evento.target as HTMLInputElement;
    const archivos = Array.from(entrada.files ?? []);
    entrada.value = '';
    let error: string | null = null;
    for (const archivo of archivos) {
      error = this.errorDeFotoPaso(paso, archivo);
      if (error) {
        break;
      }
      this.colocarFotoPaso(paso, archivo);
    }
    this.erroresFotoPaso.update((errores) => {
      const nuevos = new Map(errores);
      if (error) {
        nuevos.set(paso, error);
      } else {
        nuevos.delete(paso);
      }
      return nuevos;
    });
  }

  private errorDeFotoPaso(paso: AbstractControl, archivo: File) {
    const error = validarImagen(archivo);
    if (error) {
      return error;
    }
    if (this.fotosDe(paso).length >= MAXIMO_FOTOS_POR_PASO) {
      return 'publicaciones.paso_foto_maximo_paso';
    }
    return this.totalFotosDePasos() >= MAXIMO_FOTOS_PASOS ? 'publicaciones.paso_foto_maximo' : null;
  }

  private colocarFotoPaso(paso: AbstractControl, archivo: File) {
    this.fotosPasos.update((fotos) =>
      new Map(fotos).set(paso, [
        ...(fotos.get(paso) ?? []),
        { archivo, url: URL.createObjectURL(archivo) },
      ]),
    );
  }

  quitarFotoPaso(paso: AbstractControl, indice: number) {
    const fotos = this.fotosDe(paso);
    if (fotos[indice]) {
      URL.revokeObjectURL(fotos[indice].url);
    }
    this.fotosPasos.update((todas) => {
      const nuevas = new Map(todas);
      const restantes = fotos.filter((_, posicion) => posicion !== indice);
      if (restantes.length) {
        nuevas.set(paso, restantes);
      } else {
        nuevas.delete(paso);
      }
      return nuevas;
    });
    this.erroresFotoPaso.update((errores) => {
      const nuevos = new Map(errores);
      nuevos.delete(paso);
      return nuevos;
    });
  }

  private quitarFotosDelPaso(paso: AbstractControl) {
    this.fotosDe(paso).forEach(({ url }) => URL.revokeObjectURL(url));
    this.fotosPasos.update((todas) => {
      const nuevas = new Map(todas);
      nuevas.delete(paso);
      return nuevas;
    });
    this.erroresFotoPaso.update((errores) => {
      const nuevos = new Map(errores);
      nuevos.delete(paso);
      return nuevos;
    });
  }

  private colocarPortada(archivo: File) {
    this.soltarPortada();
    this.imagen.set(archivo);
    this.vistaPortada.set(URL.createObjectURL(archivo));
  }

  private soltarPortada() {
    const vista = this.vistaPortada();
    if (vista) {
      URL.revokeObjectURL(vista);
    }
    this.vistaPortada.set(null);
    this.imagen.set(null);
  }

  quitarImagen() {
    this.soltarPortada();
    this.errorImagen.set(null);
  }

  private async restaurarFotos() {
    const guardadas = await this.fotosBorrador.leer();
    if (!guardadas || this.publicado) {
      return;
    }
    if (guardadas.portada && !this.imagen()) {
      this.colocarPortada(guardadas.portada);
    }
    guardadas.pasos.forEach((archivos, indice) => {
      const paso = this.pasos.controls[indice];
      if (paso && !this.fotosDe(paso).length) {
        archivos.forEach((archivo) => this.colocarFotoPaso(paso, archivo));
      }
    });
  }

  private soltarFotosDePasos() {
    this.fotosPasos().forEach((fotos) => fotos.forEach(({ url }) => URL.revokeObjectURL(url)));
    this.fotosPasos.set(new Map());
    this.erroresFotoPaso.set(new Map());
  }

  private pasoIncompleto(paso: PasoForm) {
    const { titulo, texto } = paso.controls;
    return !texto.value.trim() && Boolean(titulo.value.trim() || this.fotosDe(paso).length);
  }

  private hayPasosIncompletos() {
    return this.pasos.controls.some((paso) => this.pasoIncompleto(paso));
  }

  elegirTipoRinde(tipo: TipoRinde) {
    this.tipoRinde.set(tipo);
  }

  usaFracciones(fila: FilaIngrediente) {
    return UNIDADES_CON_FRACCION.includes(fila.controls.unidad.value);
  }

  get ingredientes() {
    return this.formulario.controls.ingredientes;
  }

  numeroOpcional(maximo: number) {
    return this.formBuilder.nonNullable.control('', [
      Validators.pattern(/^\d{1,6}$/),
      Validators.min(1),
      Validators.max(maximo),
    ]);
  }

  soloDigitos(campo: (typeof CAMPOS_FICHA)[number]) {
    const control = this.formulario.controls[campo];
    const limpio = control.value.replace(/\D/g, '');
    if (limpio !== control.value) {
      control.setValue(limpio);
    }
  }

  ajustar(campo: (typeof CAMPOS_FICHA)[number], direccion: 1 | -1) {
    const actual = Number(this.formulario.controls[campo].value) || 0;
    const siguiente =
      actual === 0 && direccion === 1
        ? EJEMPLOS_FICHA[campo]
        : actual + direccion * PASOS_FICHA[campo];
    this.fijarFicha(campo, siguiente);
  }

  elegirTiempo(minutos: number) {
    const actual = Number(this.formulario.controls.tiempoMinutos.value);
    this.fijarFicha('tiempoMinutos', actual === minutos ? 0 : minutos);
  }

  tiempoElegido(minutos: number) {
    return Number(this.formulario.controls.tiempoMinutos.value) === minutos;
  }

  etiquetaTiempo(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (!horas) {
      return this.traductor.instant('publicaciones.minutos', { n: resto });
    }
    return resto
      ? this.traductor.instant('publicaciones.tiempo_h_min', { h: horas, m: resto })
      : this.traductor.instant('publicaciones.tiempo_horas', { n: horas });
  }

  tiempoLegible(): string | null {
    const minutos = Number(this.formulario.controls.tiempoMinutos.value);
    return Number.isInteger(minutos) && minutos >= 60 ? this.etiquetaTiempo(minutos) : null;
  }

  private fijarFicha(campo: (typeof CAMPOS_FICHA)[number], valor: number) {
    const control = this.formulario.controls[campo];
    control.setValue(valor < 1 ? '' : String(Math.min(valor, LIMITES_FICHA[campo])));
    control.markAsDirty();
  }

  ajustarCantidad(fila: FilaIngrediente, direccion: 1 | -1) {
    const { cantidad, unidad } = fila.controls;
    const siguiente = redondear((cantidad.value ?? 0) + direccion * PASO_CANTIDAD[unidad.value]);
    cantidad.setValue(siguiente > 0 ? Math.min(siguiente, 100000) : null);
    cantidad.markAsDirty();
  }

  sumarFraccion(fila: FilaIngrediente, fraccion: number) {
    const { cantidad } = fila.controls;
    const actual = cantidad.value ?? 0;
    const entero = Math.floor(actual);
    const yaTiene = redondear(actual - entero) === fraccion;
    cantidad.setValue(yaTiene ? entero || null : entero + fraccion);
    cantidad.markAsDirty();
  }

  tieneFraccion(fila: FilaIngrediente, fraccion: number) {
    const actual = fila.controls.cantidad.value ?? 0;
    return redondear(actual - Math.floor(actual)) === fraccion;
  }

  elegirCosto(nivel: number) {
    this.costo.set(this.costo() === nivel ? null : nivel);
  }

  protected signos(cantidad: number) {
    return '$'.repeat(cantidad);
  }

  get pasos() {
    return this.formulario.controls.pasos;
  }

  nuevoPaso() {
    return this.formBuilder.nonNullable.group({
      titulo: ['', [Validators.maxLength(MAXIMO_TITULO_PASO)]],
      texto: ['', [Validators.maxLength(MAXIMO_TEXTO_PASO)]],
    });
  }

  agregarPaso() {
    if (this.pasos.length < MAXIMO_PASOS) {
      this.pasos.push(this.nuevoPaso());
    }
  }

  soltarPaso(evento: CdkDragDrop<unknown>) {
    this.moverPaso(evento.previousIndex, evento.currentIndex);
  }

  moverPaso(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= this.pasos.length || hasta === desde) {
      return;
    }
    const paso = this.pasos.at(desde);
    this.pasos.removeAt(desde);
    this.pasos.insert(hasta, paso);
  }

  quitarPaso(posicion: number) {
    this.quitarFotosDelPaso(this.pasos.at(posicion));
    this.pasos.removeAt(posicion);
  }

  nuevoIngrediente() {
    return this.formBuilder.nonNullable.group(
      {
        cantidad: [
          null as number | null,
          [Validators.min(0.01), Validators.max(100000), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
        ],
        unidad: ['g' as Unidad],
        nombre: ['', [Validators.maxLength(100)]],
      },
      { validators: ingredienteCompleto },
    );
  }

  agregarIngrediente() {
    if (this.ingredientes.length < MAXIMO_INGREDIENTES) {
      this.ingredientes.push(this.nuevoIngrediente());
    }
  }

  quitarIngrediente(posicion: number) {
    this.ingredientes.removeAt(posicion);
  }

  alCambiarUnidad(fila: FilaIngrediente) {
    const { cantidad, unidad } = fila.controls;
    if (unidad.value === 'a_gusto') {
      cantidad.reset();
      cantidad.disable();
    } else {
      cantidad.enable();
    }
  }

  protected llevaLista() {
    return this.tipo() === 'receta';
  }

  private ingredientesCargados(): Ingrediente[] {
    return this.ingredientes
      .getRawValue()
      .filter(({ nombre }) => nombre.trim())
      .map(({ nombre, cantidad, unidad }) =>
        unidad === 'a_gusto'
          ? { nombre: nombre.trim(), unidad }
          : { nombre: nombre.trim(), cantidad: cantidad!, unidad },
      );
  }

  mensajeDeIngrediente(fila: FilaIngrediente): string | null {
    const { cantidad, nombre } = fila.controls;
    if (nombre.touched && nombre.errors?.['maxlength']) {
      return this.traductor.instant('validacion.maximo', {
        n: nombre.errors['maxlength'].requiredLength,
      });
    }
    if (cantidad.touched && cantidad.invalid) {
      return this.traductor.instant('publicaciones.ingrediente_cantidad_invalida');
    }
    const falta = fila.errors?.['incompleto']?.falta;
    if (this.intentoDePublicar() && falta) {
      return this.traductor.instant(`publicaciones.ingrediente_falta_${falta}`);
    }
    return null;
  }

  mensajeDePaso(paso: PasoForm): string | null {
    if (this.intentoDePublicar() && this.pasoIncompleto(paso)) {
      return this.traductor.instant('publicaciones.paso_falta_texto');
    }
    const { titulo, texto } = paso.controls;
    for (const control of [titulo, texto]) {
      if (control.touched && control.errors?.['maxlength']) {
        return this.traductor.instant('validacion.maximo', {
          n: control.errors['maxlength'].requiredLength,
        });
      }
    }
    return null;
  }

  mensajeDeError(campo: string): string | null {
    const control = this.formulario.get(campo);
    if (!control?.touched) {
      return null;
    }
    if (control.errors?.['required']) {
      return this.traductor.instant('comun.obligatorio');
    }
    if (
      campo in LIMITES_FICHA &&
      (control.errors?.['pattern'] || control.errors?.['min'] || control.errors?.['max'])
    ) {
      return this.traductor.instant('validacion.entero', {
        max: LIMITES_FICHA[campo as keyof typeof LIMITES_FICHA],
      });
    }
    if (control.errors?.['maxlength']) {
      return this.traductor.instant('validacion.maximo', {
        n: control.errors['maxlength'].requiredLength,
      });
    }
    return null;
  }

  renovarSesion() {
    this.auth.refrescar().subscribe({
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.avisoSesion.set(mensajeDeApi(error));
        }
      },
    });
  }

  alCambiarVisibilidad() {
    if (document.visibilityState === 'hidden') {
      this.guardarBorrador();
    } else {
      this.renovarSesion();
    }
  }

  ingresarDeNuevo() {
    this.guardarBorrador();
    this.auth.salir();
    this.router.navigate(['/login']);
  }

  guardarBorrador() {
    if (this.publicado) {
      return;
    }
    const { titulo, mensaje, porciones, tiempoMinutos, calorias } = this.formulario.getRawValue();
    const conFotosDePasos = this.pasos.controls.some((paso) => this.fotosDe(paso).length > 0);
    this.guardadoEn.set(
      this.borrador.guardar({
        tipo: this.tipo(),
        titulo,
        mensaje,
        porciones,
        tipoRinde: this.tipoRinde(),
        tiempoMinutos,
        calorias,
        costo: this.costo(),
        ingredientes: this.ingredientes.getRawValue(),
        pasos: this.pasos.getRawValue(),
        conFotos: Boolean(this.imagen()) || conFotosDePasos,
      }),
    );
    void this.fotosBorrador.guardar({
      portada: this.imagen(),
      pasos: this.pasos.controls.map((paso) => this.fotosDe(paso).map(({ archivo }) => archivo)),
    });
  }

  descartarBorrador() {
    this.borrador.borrar();
    void this.fotosBorrador.borrar();
    this.reiniciarFormulario();
    this.borradorRecuperado.set(null);
    this.guardadoEn.set(null);
  }

  private restaurar(guardado: BorradorPublicacion) {
    this.tipo.set(guardado.tipo);
    this.tipoRinde.set(guardado.tipoRinde);
    this.costo.set(guardado.costo);
    this.formulario.patchValue({
      titulo: guardado.titulo,
      mensaje: guardado.mensaje,
      porciones: guardado.porciones,
      tiempoMinutos: guardado.tiempoMinutos,
      calorias: guardado.calorias,
    });

    this.ingredientes.clear();
    for (const fila of guardado.ingredientes) {
      const grupo = this.nuevoIngrediente();
      grupo.patchValue(fila);
      this.alCambiarUnidad(grupo);
      this.ingredientes.push(grupo);
    }
    if (!this.ingredientes.length) {
      this.agregarIngrediente();
    }

    this.pasos.clear();
    for (const paso of guardado.pasos) {
      const grupo = this.nuevoPaso();
      grupo.setValue(paso);
      this.pasos.push(grupo);
    }
    if (!this.pasos.length) {
      this.agregarPaso();
    }
  }

  private reiniciarFormulario() {
    this.formulario.reset();
    this.ingredientes.clear();
    this.agregarIngrediente();
    this.soltarFotosDePasos();
    this.pasos.clear();
    this.agregarPaso();
    this.costo.set(null);
    this.tipoRinde.set('porciones');
    this.tipo.set('receta');
    this.soltarPortada();
    this.errorImagen.set(null);
    this.intentoDePublicar.set(false);
  }

  elegirImagen(evento: Event) {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    const error = validarImagen(archivo);
    this.errorImagen.set(error);
    if (archivo && !error) {
      this.colocarPortada(archivo);
    } else if (error) {
      this.soltarPortada();
    }
  }

  publicar() {
    this.intentoDePublicar.set(true);
    this.formulario.markAllAsTouched();
    if (
      this.formulario.invalid ||
      this.errorImagen() ||
      this.hayPasosIncompletos() ||
      this.publicando()
    ) {
      return;
    }

    const { titulo, mensaje, porciones, tiempoMinutos, calorias } = this.formulario.getRawValue();
    const datos = new FormData();
    const pasos = this.armarPasos(datos);
    const ingredientes = this.ingredientesCargados();
    datos.append('tipo', this.tipo());
    datos.append('titulo', titulo.trim());
    datos.append('mensaje', mensaje.trim());
    if (this.llevaLista() && ingredientes.length) {
      datos.append('ingredientes', JSON.stringify(ingredientes));
    }
    if (this.llevaLista() && pasos.length) {
      datos.append('pasos', JSON.stringify(pasos));
    }
    if (this.llevaLista()) {
      this.agregarFicha(datos, { porciones, tiempoMinutos, calorias });
    }
    const imagen = this.imagen();
    if (imagen) {
      datos.append('imagen', imagen);
    }

    this.publicando.set(true);
    this.api.crear(datos).subscribe({
      next: () => {
        this.publicado = true;
        this.borrador.borrar();
        void this.fotosBorrador.borrar();
        this.router.navigate(['/publicaciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.publicando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }

  private armarPasos(datos: FormData) {
    const pasos: { titulo?: string; texto: string; fotos?: number[] }[] = [];
    let fotosEnviadas = 0;
    for (const control of this.pasos.controls) {
      const { titulo, texto: textoDelPaso } = control.getRawValue();
      const texto = textoDelPaso.trim();
      if (!texto) {
        continue;
      }
      const paso: { titulo?: string; texto: string; fotos?: number[] } = { texto };
      if (titulo.trim()) {
        paso.titulo = titulo.trim();
      }
      const fotos = this.llevaLista() ? this.fotosDe(control) : [];
      if (fotos.length) {
        paso.fotos = fotos.map(({ archivo }) => {
          datos.append('imagenesPasos', archivo);
          return fotosEnviadas++;
        });
      }
      pasos.push(paso);
    }
    return pasos;
  }

  private agregarFicha(
    datos: FormData,
    medidas: { porciones: string; tiempoMinutos: string; calorias: string },
  ) {
    const ficha = { ...medidas, costo: this.costo()?.toString() ?? '' };
    if (medidas.porciones.trim()) {
      datos.append('tipoRinde', this.tipoRinde());
    }
    for (const [campo, valor] of Object.entries(ficha)) {
      if (valor.trim()) {
        datos.append(campo, valor.trim());
      }
    }
  }
}
