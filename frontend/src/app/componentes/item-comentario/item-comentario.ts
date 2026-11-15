import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Comentario, MAXIMO_COMENTARIO } from '../../interfaces/comentario';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { errorDeComentario, VALIDADORES_COMENTARIO } from '../../utilidades/comentario';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { ContadorTexto } from '../contador-texto/contador-texto';
import { Aviso } from '../aviso/aviso';

@Component({
  imports: [DatePipe, FechaRelativa, ReactiveFormsModule, Aviso, ContadorTexto, TranslatePipe],
  selector: 'app-item-comentario',
  templateUrl: './item-comentario.html',
})
export class ItemComentario {
  private auth = inject(Auth);
  private api = inject(PublicacionesApi);
  private formBuilder = inject(FormBuilder);
  private traductor = inject(TranslateService);

  readonly comentario = input.required<Comentario>();
  readonly publicacionId = input.required<string>();
  readonly modificado = output<Comentario>();

  readonly maximo = MAXIMO_COMENTARIO;
  readonly formulario = this.formBuilder.nonNullable.group({
    mensaje: ['', VALIDADORES_COMENTARIO],
  });
  readonly editando = signal(false);
  readonly enviando = signal(false);
  readonly errorAlEditar = signal<string | null>(null);

  readonly esDeQuienIngreso = computed(
    () => this.auth.usuario()?._id === this.comentario().usuario._id,
  );

  protected urlImagen = urlImagen;

  mensajeDeError() {
    return errorDeComentario(this.formulario.controls.mensaje, this.traductor);
  }

  editar() {
    this.formulario.reset({ mensaje: this.comentario().mensaje });
    this.errorAlEditar.set(null);
    this.editando.set(true);
  }

  cancelar() {
    this.errorAlEditar.set(null);
    this.editando.set(false);
  }

  guardar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) {
      return;
    }

    const mensaje = this.formulario.getRawValue().mensaje.trim();
    if (mensaje === this.comentario().mensaje) {
      this.editando.set(false);
      return;
    }

    this.enviando.set(true);
    this.errorAlEditar.set(null);
    this.api.editarComentario(this.publicacionId(), this.comentario()._id, mensaje).subscribe({
      next: (editado) => {
        this.modificado.emit(editado);
        this.editando.set(false);
        this.enviando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorAlEditar.set(mensajeDeApi(error));
        this.enviando.set(false);
      },
    });
  }
}
