import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../servicios/auth/auth';
import { Google } from '../../servicios/google/google';
import { Instalacion } from '../../servicios/instalacion/instalacion';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [TranslatePipe],
  selector: 'app-boton-google',
  templateUrl: './boton-google.html',
})
export class BotonGoogle implements AfterViewInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private instalacion = inject(Instalacion);
  protected google = inject(Google);

  private readonly contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');

  readonly fallo = output<string | null>();
  protected readonly visible = signal(false);

  async ngAfterViewInit() {
    const contenedor = this.contenedor()?.nativeElement;
    if (!contenedor || !this.google.disponible) {
      return;
    }
    const listo = await this.google.mostrarBoton(contenedor, (credencial) =>
      this.ingresar(credencial),
    );
    this.visible.set(listo);
  }

  private ingresar(credencial: string) {
    this.fallo.emit(null);
    this.auth.google(credencial).subscribe({
      next: () => {
        this.instalacion.ofrecerAlIngresar();
        this.router.navigateByUrl(this.auth.destinoAlIngresar());
      },
      error: (error: HttpErrorResponse) => this.fallo.emit(mensajeDeApi(error)),
    });
  }
}
