import { Service, signal } from '@angular/core';

@Service()
export class Tema {
  readonly actual = signal(this.inicial());

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
  }

  private guardar() {
    try {
      localStorage.setItem('tema', this.actual());
    } catch {
      return;
    }
  }

  private inicial() {
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

  private delSistema() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
}
