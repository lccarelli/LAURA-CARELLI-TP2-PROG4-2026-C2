import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import { Auth } from '../auth/auth';

interface EventoDeInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const CLAVE_DECIDIDAS = 'instalacion:decididas';
const ANCHO_DE_CELULAR = '(max-width: 767px)';

@Service()
export class Instalacion {
  private documento = inject(DOCUMENT);
  private ventana = this.documento.defaultView!;
  private auth = inject(Auth);
  private evento: EventoDeInstalacion | null = null;

  readonly puedeInstalar = signal(false);
  readonly instalada = signal(this.estaInstalada());
  readonly esIos = this.detectarIos();
  readonly alIngresar = signal(false);
  private readonly decididas = signal(this.leerDecididas());
  readonly mostrarCartel = computed(() => {
    const persona = this.auth.usuario()?._id;
    return (
      this.alIngresar() &&
      persona !== undefined &&
      !this.decididas().includes(persona) &&
      !this.instalada() &&
      this.esCelular() &&
      (this.puedeInstalar() || this.esIos)
    );
  });

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
      this.registrarDecision();
    });
  }

  ofrecerAlIngresar() {
    this.alIngresar.set(true);
  }

  descartarCartel() {
    this.registrarDecision();
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
      this.registrarDecision();
    }
  }

  private esCelular() {
    return this.ventana.matchMedia?.(ANCHO_DE_CELULAR).matches === true;
  }

  private registrarDecision() {
    const persona = this.auth.usuario()?._id;
    if (!persona || this.decididas().includes(persona)) {
      return;
    }
    const nuevas = [...this.decididas(), persona];
    this.decididas.set(nuevas);
    try {
      this.ventana.localStorage.setItem(CLAVE_DECIDIDAS, JSON.stringify(nuevas));
    } catch {
      // sin almacenamiento la decisión vale hasta cerrar la pestaña
    }
  }

  private leerDecididas(): string[] {
    try {
      const guardado = JSON.parse(this.ventana.localStorage.getItem(CLAVE_DECIDIDAS) ?? '[]');
      return Array.isArray(guardado) ? guardado.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
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
