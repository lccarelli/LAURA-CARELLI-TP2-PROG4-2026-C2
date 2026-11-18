import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Idioma } from '../idioma/idioma';

export const ANCHO_MAXIMO_BOTON = 400;
export const ANCHO_MINIMO_BOTON = 200;
export const ANCHO_SI_NO_SE_PUEDE_MEDIR = 280;
const DIRECCION_DEL_SDK = 'https://accounts.google.com/gsi/client';

@Service()
export class Google {
  private idioma = inject(Idioma);
  private carga?: Promise<boolean>;

  readonly disponible = Boolean(environment.GOOGLE_CLIENT_ID);

  cargar() {
    this.carga ??= new Promise<boolean>((resolver) => {
      if (!this.disponible) {
        resolver(false);
        return;
      }
      if (typeof google !== 'undefined' && google.accounts?.id) {
        resolver(true);
        return;
      }
      const script = document.createElement('script');
      script.src = DIRECCION_DEL_SDK;
      script.async = true;
      script.onload = () => resolver(true);
      script.onerror = () => {
        this.carga = undefined;
        resolver(false);
      };
      document.head.append(script);
    });
    return this.carga;
  }

  private anchoPara(contenedor: HTMLElement) {
    const disponible = contenedor.clientWidth || ANCHO_SI_NO_SE_PUEDE_MEDIR;
    return Math.max(ANCHO_MINIMO_BOTON, Math.min(disponible, ANCHO_MAXIMO_BOTON));
  }

  async mostrarBoton(contenedor: HTMLElement, alRecibir: (credencial: string) => void) {
    if (!(await this.cargar())) {
      return false;
    }
    google.accounts.id.initialize({
      client_id: environment.GOOGLE_CLIENT_ID,
      callback: ({ credential }) => alRecibir(credential),
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    google.accounts.id.renderButton(contenedor, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: this.idioma.actual() ?? undefined,
      width: this.anchoPara(contenedor),
    });
    return true;
  }
}
