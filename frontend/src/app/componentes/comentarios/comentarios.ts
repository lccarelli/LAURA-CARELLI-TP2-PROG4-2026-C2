import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Comentario, MAXIMO_COMENTARIO } from '../../interfaces/comentario';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { errorDeComentario, VALIDADORES_COMENTARIO } from '../../utilidades/comentario';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { Aviso } from '../aviso/aviso';
import { ItemComentario } from '../item-comentario/item-comentario';
import { ContadorTexto } from '../contador-texto/contador-texto';

@Component({
  imports: [ReactiveFormsModule, Aviso, ContadorTexto, ItemComentario, TranslatePipe],
  selector: 'app-comentarios',
  templateUrl: './comentarios.html',
})
export class Comentarios implements OnInit, OnDestroy {
  protected auth = inject(Auth);
  private api = inject(PublicacionesApi);
  private formBuilder = inject(FormBuilder);
  private traductor = inject(TranslateService);

  private pedido?: Subscription;

  readonly publicacionId = input.required<string>();
  readonly creado = output<void>();

  readonly maximo = MAXIMO_COMENTARIO;
  readonly formulario = this.formBuilder.nonNullable.group({
    mensaje: ['', VALIDADORES_COMENTARIO],
  });
  readonly enviando = signal(false);
  readonly errorAlComentar = signal<string | null>(null);

  readonly comentarios = signal<Comentario[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly fallaLaCarga = signal(false);
  readonly mensajeError = signal<string | null>(null);

  protected urlImagen = urlImagen;

  ngOnInit() {
    this.cargarMas();
  }

  ngOnDestroy() {
    this.pedido?.unsubscribe();
  }

  mensajeDeError() {
    return errorDeComentario(this.formulario.controls.mensaje, this.traductor);
  }

  reemplazar(editado: Comentario) {
    this.comentarios.update((actuales) =>
      actuales.map((comentario) => (comentario._id === editado._id ? editado : comentario)),
    );
  }

  enviar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.errorAlComentar.set(null);
    this.api
      .comentar(this.publicacionId(), this.formulario.getRawValue().mensaje.trim())
      .subscribe({
        next: (comentario) => {
          this.comentarios.update((actuales) => [comentario, ...actuales]);
          this.formulario.reset();
          this.enviando.set(false);
          this.creado.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.errorAlComentar.set(mensajeDeApi(error));
          this.enviando.set(false);
        },
      });
  }

  cargarMas() {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.pedido = this.api
      .listarComentarios(this.publicacionId(), this.comentarios().length)
      .subscribe({
        next: (pagina) => {
          const ids = new Set(this.comentarios().map((comentario) => comentario._id));
          const nuevos = pagina.datos.filter((comentario) => !ids.has(comentario._id));
          this.comentarios.update((actuales) => [...actuales, ...nuevos]);
          this.cargando.set(false);
          this.fallaLaCarga.set(false);
          this.hayMas.set(pagina.hayMas);
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError.set(mensajeDeApi(error));
          this.fallaLaCarga.set(true);
          this.cargando.set(false);
        },
      });
  }
}
