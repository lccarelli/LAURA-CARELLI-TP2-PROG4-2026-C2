import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';

interface EventoDeInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLAVE_DESCARTADO = 'instalacion:descartado';
export const DIAS_SIN_INSISTIR = 14;
const UN_DIA = 24 * 60 * 60 * 1000;
const ANCHO_DE_CELULAR = '(max-width: 767px)';

@Service()
export class Instalacion {
  private documento = inject(DOCUMENT);
  private ventana = this.documento.defaultView!;
  private evento: EventoDeInstalacion | null = null;

  readonly puedeInstalar = signal(false);
  readonly instalada = signal(this.estaInstalada());
  readonly esIos = this.detectarIos();
  readonly descartado = signal(this.descartadoVigente());
  readonly mostrarCartel = computed(
    () =>
      !this.instalada() &&
      !this.descartado() &&
      this.esCelular() &&
      (this.puedeInstalar() || this.esIos),
  );

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

  descartarCartel() {
    try {
      this.ventana.localStorage.setItem(CLAVE_DESCARTADO, String(Date.now()));
    } catch {
      // sin almacenamiento el cartel vuelve en la próxima visita
    }
    this.descartado.set(true);
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

  private esCelular() {
    return this.ventana.matchMedia?.(ANCHO_DE_CELULAR).matches === true;
  }

  private descartadoVigente() {
    try {
      const guardado = Number(this.ventana.localStorage.getItem(CLAVE_DESCARTADO));
      return guardado > 0 && Date.now() - guardado < DIAS_SIN_INSISTIR * UN_DIA;
    } catch {
      return false;
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
