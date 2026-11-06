import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
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
import { Ingrediente, Tipo, TIPOS, Unidad, UNIDADES } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { Borrador, BorradorPublicacion } from '../../servicios/borrador/borrador';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { validarImagen } from '../../utilidades/imagen';

const MAXIMO_INGREDIENTES = 40;
const MAXIMO_PASOS = 40;
const LIMITES_FICHA = { porciones: 100, tiempoMinutos: 10080, calorias: 10000 } as const;
const COSTOS = [1, 2, 3, 4] as const;
const CAMPOS_FICHA = ['porciones', 'tiempoMinutos', 'calorias'] as const;
const INTERVALO_RENOVACION_MS = 5 * 60 * 1000;
const ESPERA_AUTOGUARDADO_MS = 800;
const EJEMPLOS_FICHA = { porciones: 4, tiempoMinutos: 30, calorias: 250 } as const;

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
export class NuevaPublicacion implements OnDestroy {
  private auth = inject(Auth);
  private borrador = inject(Borrador);
  private publicado = false;

  private api = inject(PublicacionesApi);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private traductor = inject(TranslateService);

  readonly publicando = signal(false);
  readonly tipos = TIPOS;
  readonly unidades = UNIDADES;
  readonly maximoIngredientes = MAXIMO_INGREDIENTES;
  readonly maximoPasos = MAXIMO_PASOS;
  readonly costos = COSTOS;
  readonly camposFicha = CAMPOS_FICHA;
  readonly ejemplosFicha = EJEMPLOS_FICHA;
  readonly intentoDePublicar = signal(false);
  readonly costo = signal<number | null>(null);
  readonly tipo = signal<Tipo>('receta');
  readonly imagen = signal<File | null>(null);
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
    }

    merge(
      this.formulario.valueChanges,
      toObservable(this.tipo).pipe(skip(1)),
      toObservable(this.costo).pipe(skip(1)),
    )
      .pipe(debounceTime(ESPERA_AUTOGUARDADO_MS), takeUntilDestroyed())
      .subscribe(() => this.guardarBorrador());

    this.renovarSesion();
    interval(INTERVALO_RENOVACION_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.renovarSesion());
  }

  ngOnDestroy() {
    this.guardarBorrador();
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
    return this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]);
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
    return this.tipo() === 'receta' || this.tipo() === 'completa';
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

  mensajeDePaso(paso: AbstractControl): string | null {
    if (paso.touched && paso.errors?.['maxlength']) {
      return this.traductor.instant('validacion.maximo', {
        n: paso.errors['maxlength'].requiredLength,
      });
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
    this.guardadoEn.set(
      this.borrador.guardar({
        tipo: this.tipo(),
        titulo,
        mensaje,
        porciones,
        tiempoMinutos,
        calorias,
        costo: this.costo(),
        ingredientes: this.ingredientes.getRawValue(),
        pasos: this.pasos.getRawValue(),
      }),
    );
  }

  descartarBorrador() {
    this.borrador.borrar();
    this.reiniciarFormulario();
    this.borradorRecuperado.set(null);
    this.guardadoEn.set(null);
  }

  private restaurar(guardado: BorradorPublicacion) {
    this.tipo.set(guardado.tipo);
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
      const control = this.nuevoPaso();
      control.setValue(paso);
      this.pasos.push(control);
    }
    if (!this.pasos.length) {
      this.agregarPaso();
    }
  }

  private reiniciarFormulario() {
    this.formulario.reset();
    this.ingredientes.clear();
    this.agregarIngrediente();
    this.pasos.clear();
    this.agregarPaso();
    this.costo.set(null);
    this.tipo.set('receta');
    this.imagen.set(null);
    this.errorImagen.set(null);
    this.intentoDePublicar.set(false);
  }

  elegirImagen(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const error = validarImagen(archivo);
    this.errorImagen.set(error);
    this.imagen.set(error ? null : archivo);
  }

  publicar() {
    this.intentoDePublicar.set(true);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.errorImagen() || this.publicando()) {
      return;
    }

    const { titulo, mensaje, porciones, tiempoMinutos, calorias } = this.formulario.getRawValue();
    const pasos = this.pasos
      .getRawValue()
      .map((paso) => paso.trim())
      .filter(Boolean);
    const ingredientes = this.ingredientesCargados();
    const datos = new FormData();
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
      const ficha = { porciones, tiempoMinutos, calorias, costo: this.costo()?.toString() ?? '' };
      for (const [campo, valor] of Object.entries(ficha)) {
        if (valor.trim()) {
          datos.append(campo, valor.trim());
        }
      }
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
        this.router.navigate(['/publicaciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.publicando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
