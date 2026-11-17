import { Component, effect, input, OnDestroy, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icono } from '../icono/icono';

const ESPERA_MS = 400;
const LARGO_MINIMO = 2;
const LARGO_MAXIMO = 60;
const PALABRAS_MAXIMAS = 5;

const normalizar = (texto: string) =>
  texto.trim().split(/\s+/).slice(0, PALABRAS_MAXIMAS).join(' ').slice(0, LARGO_MAXIMO);

@Component({
  imports: [Icono, TranslatePipe],
  selector: 'app-buscador',
  templateUrl: './buscador.html',
})
export class Buscador implements OnDestroy {
  readonly valor = input('');
  readonly descripcion = input('buscador.placeholder');
  readonly buscar = output<string>();

  protected readonly texto = signal('');
  protected readonly largoMaximo = LARGO_MAXIMO;
  private espera?: ReturnType<typeof setTimeout>;
  private enviado = '';

  constructor() {
    effect(() => {
      const valor = this.valor();
      if (valor !== this.enviado) {
        clearTimeout(this.espera);
        this.texto.set(valor);
        this.enviado = valor;
      }
    });
  }

  ngOnDestroy() {
    clearTimeout(this.espera);
  }

  protected alEscribir(valor: string) {
    this.texto.set(valor);
    clearTimeout(this.espera);
    this.espera = setTimeout(() => this.enviar(), ESPERA_MS);
  }

  protected buscarYa() {
    clearTimeout(this.espera);
    this.enviar();
  }

  protected limpiar() {
    this.texto.set('');
    this.buscarYa();
  }

  private enviar() {
    const normalizado = normalizar(this.texto());
    const consulta = normalizado.length >= LARGO_MINIMO ? normalizado : '';
    if (consulta === this.enviado) {
      return;
    }
    this.enviado = consulta;
    this.buscar.emit(consulta);
  }
}
