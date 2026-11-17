import { Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icono } from '../icono/icono';
import { ModalCompartir } from '../modal-compartir/modal-compartir';

@Component({
  imports: [Icono, ModalCompartir, TranslatePipe],
  selector: 'app-boton-compartir',
  templateUrl: './boton-compartir.html',
})
export class BotonCompartir {
  readonly publicacionId = input.required<string>();
  readonly compartida = output<number>();
  readonly abierto = output<void>();

  protected readonly eligiendo = signal(false);

  protected abrir() {
    this.abierto.emit();
    this.eligiendo.set(true);
  }

  protected alCompartir(cantidad: number) {
    this.eligiendo.set(false);
    this.compartida.emit(cantidad);
  }
}
