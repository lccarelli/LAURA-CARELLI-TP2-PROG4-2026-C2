import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, PendingTasks, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { CamposPersonales } from '../../componentes/campos-personales/campos-personales';
import { Auth } from '../../servicios/auth/auth';
import { Imagenes } from '../../servicios/imagenes/imagenes';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen, validarImagen } from '../../utilidades/imagen';
import { mensajeDeLargo } from '../../utilidades/validadores';

@Component({
  imports: [Aviso, CamposPersonales, ReactiveFormsModule, RouterLink, TranslatePipe],
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.html',
})
export class EditarPerfil implements OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private traductor = inject(TranslateService);
  private imagenes = inject(Imagenes);
  private tareas = inject(PendingTasks);
  private imagenesEnProceso = signal(0);
  private readonly usuario = this.auth.usuario();

  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: [
      this.usuario?.nombre ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
    apellido: [
      this.usuario?.apellido ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
    descripcion: [
      this.usuario?.descripcion ?? '',
      [Validators.required, Validators.maxLength(200)],
    ],
  });

  readonly imagen = signal<File | null>(null);
  readonly vistaNueva = signal<string | null>(null);
  readonly fotoQuitada = signal(false);
  readonly errorImagen = signal<string | null>(null);
  readonly enviando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly preparandoImagen = computed(() => this.imagenesEnProceso() > 0);
  readonly fotoActual = computed(
    () => this.vistaNueva() ?? (this.fotoQuitada() ? null : (this.usuario?.imagenPerfil ?? null)),
  );
  protected urlImagen = urlImagen;

  ngOnDestroy() {
    this.soltarVista();
  }

  mensajeDeDescripcion() {
    return mensajeDeLargo(this.formulario.controls.descripcion, this.traductor);
  }

  elegirImagen(evento: Event) {
    const entrada = evento.target as HTMLInputElement;
    const original = entrada.files?.[0] ?? null;
    entrada.value = '';
    this.imagenesEnProceso.update((n) => n + 1);
    this.tareas.run(async () => {
      try {
        const archivo = original && (await this.imagenes.preparar(original));
        const error = validarImagen(archivo);
        this.errorImagen.set(error);
        if (archivo && !error) {
          this.soltarVista();
          this.imagen.set(archivo);
          this.vistaNueva.set(URL.createObjectURL(archivo));
          this.fotoQuitada.set(false);
        }
      } finally {
        this.imagenesEnProceso.update((n) => n - 1);
      }
    });
  }

  quitarFoto() {
    this.soltarVista();
    this.errorImagen.set(null);
    this.fotoQuitada.set(true);
  }

  private soltarVista() {
    const vista = this.vistaNueva();
    if (vista) {
      URL.revokeObjectURL(vista);
    }
    this.vistaNueva.set(null);
    this.imagen.set(null);
  }

  guardar() {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando() || this.preparandoImagen()) {
      return;
    }

    const datos = new FormData();
    for (const [campo, valor] of Object.entries(this.formulario.getRawValue())) {
      datos.append(campo, valor.trim());
    }
    const imagen = this.imagen();
    if (imagen) {
      datos.append('imagen', imagen);
    } else if (this.fotoQuitada() && this.usuario?.imagenPerfil) {
      datos.append('quitarImagen', 'true');
    }

    this.enviando.set(true);
    this.auth.editarPerfil(datos).subscribe({
      next: () => this.router.navigate(['/perfil']),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
