import { HttpContextToken } from '@angular/common/http';
import { computed, Service, signal } from '@angular/core';
import { MENSAJE_POR_DEFECTO, MensajeDeCarga } from './mensajes-de-carga';

export const RETRASO_MS = 200;
export const PERMANENCIA_MINIMA_MS = 400;

export const SIN_INDICADOR_DE_CARGA = new HttpContextToken<boolean>(() => false);
export const MENSAJE_DE_CARGA = new HttpContextToken<MensajeDeCarga | null>(() => null);

interface Espera {
  id: number;
  mensaje: MensajeDeCarga;
  temporizadorDeNota?: ReturnType<typeof setTimeout>;
}

@Service()
export class Carga {
  private siguiente = 0;
  private esperas: Espera[] = [];
  private temporizadorDeAparicion?: ReturnType<typeof setTimeout>;
  private temporizadorDeSalida?: ReturnType<typeof setTimeout>;
  private visibleDesde = 0;

  private readonly notasMostradas = signal<string[]>([]);
  private readonly actual = signal<MensajeDeCarga>(MENSAJE_POR_DEFECTO);

  readonly visible = signal(false);
  readonly mensaje = computed(() => this.actual().clave);
  readonly nota = computed(() => {
    const nota = this.actual().nota;
    return nota && this.notasMostradas().includes(nota) ? nota : null;
  });

  iniciar(mensaje: MensajeDeCarga = MENSAJE_POR_DEFECTO) {
    const espera: Espera = { id: this.siguiente++, mensaje };
    this.esperas.push(espera);
    this.actualizarMensaje();
    clearTimeout(this.temporizadorDeSalida);
    if (mensaje.nota) {
      espera.temporizadorDeNota = setTimeout(
        () => this.notasMostradas.update((notas) => [...notas, mensaje.nota!]),
        (mensaje.segundosHastaNota ?? 0) * 1000,
      );
    }
    if (!this.visible() && this.temporizadorDeAparicion === undefined) {
      this.temporizadorDeAparicion = setTimeout(() => this.mostrar(), RETRASO_MS);
    }
    return espera.id;
  }

  terminar(id: number) {
    const espera = this.esperas.find((candidata) => candidata.id === id);
    if (!espera) {
      return;
    }
    clearTimeout(espera.temporizadorDeNota);
    this.esperas = this.esperas.filter((candidata) => candidata !== espera);
    if (this.esperas.length) {
      this.actualizarMensaje();
      return;
    }
    this.apagar();
  }

  private mostrar() {
    this.temporizadorDeAparicion = undefined;
    if (this.esperas.length) {
      this.visibleDesde = Date.now();
      this.visible.set(true);
    }
  }

  private apagar() {
    clearTimeout(this.temporizadorDeAparicion);
    this.temporizadorDeAparicion = undefined;
    if (!this.visible()) {
      this.notasMostradas.set([]);
      return;
    }
    const restante = PERMANENCIA_MINIMA_MS - (Date.now() - this.visibleDesde);
    this.temporizadorDeSalida = setTimeout(() => this.ocultar(), Math.max(0, restante));
  }

  private ocultar() {
    if (this.esperas.length) {
      return;
    }
    this.visible.set(false);
    this.notasMostradas.set([]);
    this.actual.set(MENSAJE_POR_DEFECTO);
  }

  private actualizarMensaje() {
    const ultimaConMensaje = [...this.esperas]
      .reverse()
      .find(({ mensaje }) => mensaje.clave !== MENSAJE_POR_DEFECTO.clave);
    this.actual.set((ultimaConMensaje ?? this.esperas[this.esperas.length - 1]).mensaje);
  }
}
