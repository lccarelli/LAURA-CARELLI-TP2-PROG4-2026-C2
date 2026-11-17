import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, debounceTime, map, of, Subject, switchMap } from 'rxjs';
import { AutoFoco } from '../../directivas/auto-foco/auto-foco';
import { PersonaDelDirectorio } from '../../interfaces/usuario';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { UsuariosApi } from '../../servicios/usuarios/usuarios';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { Aviso } from '../aviso/aviso';
import { Icono } from '../icono/icono';

export const MAXIMO_DESTINATARIOS = 20;
export const MINIMO_BUSQUEDA = 2;
export const ESPERA_BUSQUEDA_MS = 300;

@Component({
  imports: [Aviso, AutoFoco, Icono, TranslatePipe],
  selector: 'app-modal-compartir',
  templateUrl: './modal-compartir.html',
})
export class ModalCompartir {
  private publicaciones = inject(PublicacionesApi);
  private usuarios = inject(UsuariosApi);

  readonly publicacionId = input.required<string>();
  readonly compartida = output<number>();
  readonly cancelado = output<void>();

  protected readonly maximo = MAXIMO_DESTINATARIOS;
  protected urlImagen = urlImagen;
  protected readonly texto = signal('');
  protected readonly encontradas = signal<PersonaDelDirectorio[]>([]);
  protected readonly elegidas = signal<PersonaDelDirectorio[]>([]);
  protected readonly enviando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);

  protected readonly resultados = computed(() => {
    const ids = new Set(this.elegidas().map(({ _id }) => _id));
    return this.encontradas().filter(({ _id }) => !ids.has(_id));
  });
  protected readonly sinResultados = computed(
    () => this.texto().length >= MINIMO_BUSQUEDA && this.encontradas().length === 0,
  );
  protected readonly completo = computed(() => this.elegidas().length >= MAXIMO_DESTINATARIOS);

  private busquedas = new Subject<string>();

  constructor() {
    this.busquedas
      .pipe(
        debounceTime(ESPERA_BUSQUEDA_MS),
        switchMap((texto) =>
          texto.length < MINIMO_BUSQUEDA
            ? of([])
            : this.usuarios.directorio(texto).pipe(
                map(({ datos }) => datos),
                catchError(() => of([])),
              ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((personas) => this.encontradas.set(personas));
  }

  protected buscar(valor: string) {
    const texto = valor.trim();
    this.texto.set(texto);
    this.busquedas.next(texto);
  }

  protected elegir(persona: PersonaDelDirectorio) {
    if (this.completo()) {
      return;
    }
    this.elegidas.update((actuales) => [...actuales, persona]);
  }

  protected quitar(id: string) {
    this.elegidas.update((actuales) => actuales.filter(({ _id }) => _id !== id));
  }

  protected salir() {
    if (!this.enviando()) {
      this.cancelado.emit();
    }
  }

  protected compartir() {
    if (this.enviando() || !this.elegidas().length) {
      return;
    }
    this.enviando.set(true);
    this.mensajeError.set(null);
    this.publicaciones
      .compartir(
        this.publicacionId(),
        this.elegidas().map(({ _id }) => _id),
      )
      .subscribe({
        next: ({ destinatarios }) => {
          this.enviando.set(false);
          this.compartida.emit(destinatarios);
        },
        error: (error: HttpErrorResponse) => {
          this.enviando.set(false);
          this.mensajeError.set(mensajeDeApi(error));
        },
      });
  }
}
