import { Service, signal } from '@angular/core';

type Modo = 'claro' | 'oscuro';

const ICONO_DE_LA_PESTANA: Record<Modo, string> = {
  claro: 'favicon.png',
  oscuro: 'favicon-oscuro.png',
};

@Service()
export class Tema {
  readonly actual = signal<Modo>(this.inicial());

  constructor() {
    this.aplicar();
  }

  alternar() {
    this.actual.update((tema) => (tema === 'claro' ? 'oscuro' : 'claro'));
    this.guardar();
    this.aplicar();
  }

  private aplicar() {
    document.documentElement.dataset['tema'] = this.actual();
    document
      .querySelector('link[rel="icon"]')
      ?.setAttribute('href', ICONO_DE_LA_PESTANA[this.actual()]);
  }

  private guardar() {
    try {
      localStorage.setItem('tema', this.actual());
    } catch {
      return;
    }
  }

  private inicial(): Modo {
    try {
      const guardado = localStorage.getItem('tema');
      if (guardado === 'claro' || guardado === 'oscuro') {
        return guardado;
      }
    } catch {
      return this.delSistema();
    }
    return this.delSistema();
  }

  private delSistema(): Modo {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
}
