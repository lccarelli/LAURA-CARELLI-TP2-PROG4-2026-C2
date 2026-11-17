import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

interface EventoDeInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Service()
export class Instalacion {
  private documento = inject(DOCUMENT);
  private ventana = this.documento.defaultView!;
  private evento: EventoDeInstalacion | null = null;

  readonly puedeInstalar = signal(false);
  readonly instalada = signal(this.estaInstalada());
  readonly esIos = this.detectarIos();

  iniciar() {
    this.ventana.addEventListener('beforeinstallprompt', (evento) => {
      evento.preventDefault();
      this.evento = evento as EventoDeInstalacion;
      this.puedeInstalar.set(!this.instalada());
    });
    this.ventana.addEventListener('appinstalled', () => {
      this.evento = null;
      this.puedeInstalar.set(false);
      this.instalada.set(true);
    });
  }

  async instalar() {
    const evento = this.evento;
    if (!evento) {
      return;
    }
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === 'accepted') {
      this.puedeInstalar.set(false);
    }
  }

  private estaInstalada() {
    const navegador = this.ventana.navigator as Navigator & { standalone?: boolean };
    return (
      this.ventana.matchMedia?.('(display-mode: standalone)').matches === true ||
      navegador.standalone === true
    );
  }

  private detectarIos() {
    const navegador = this.ventana.navigator;
    return (
      /iPad|iPhone|iPod/.test(navegador.userAgent) ||
      (navegador.platform === 'MacIntel' && navegador.maxTouchPoints > 1)
    );
  }
}
