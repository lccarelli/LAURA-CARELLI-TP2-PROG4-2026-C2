import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Idioma } from '../idioma/idioma';
import { Instalacion } from '../instalacion/instalacion';

export type EstadoDeAvisos = 'no-disponible' | 'instalar' | 'bloqueado' | 'inactivo' | 'activo';

@Service()
export class AvisosPush {
  private http = inject(HttpClient);
  private push = inject(SwPush, { optional: true });
  private instalacion = inject(Instalacion);
  private idioma = inject(Idioma);
  private base = `${environment.API_URL}/push`;

  private readonly clavePublica = signal<string | null>(null);
  private readonly permisoBloqueado = signal(false);
  readonly activo = signal(false);
  readonly trabajando = signal(false);
  readonly fallo = signal(false);

  readonly estado = computed<EstadoDeAvisos>(() => {
    if (this.instalacion.esIos && !this.instalacion.instalada()) {
      return 'instalar';
    }
    if (!this.push?.isEnabled || typeof Notification === 'undefined' || !this.clavePublica()) {
      return 'no-disponible';
    }
    if (this.permisoBloqueado()) {
      return 'bloqueado';
    }
    return this.activo() ? 'activo' : 'inactivo';
  });

  async iniciar() {
    if (!this.push?.isEnabled || typeof Notification === 'undefined') {
      return;
    }
    this.permisoBloqueado.set(Notification.permission === 'denied');
    try {
      const { clavePublica } = await firstValueFrom(
        this.http.get<{ clavePublica: string | null }>(`${this.base}/clave-publica`),
      );
      this.clavePublica.set(clavePublica);
      const suscripcion = await firstValueFrom(this.push.subscription);
      if (clavePublica && suscripcion) {
        await this.registrar(suscripcion);
      }
      this.activo.set(Boolean(clavePublica && suscripcion));
    } catch {
      this.activo.set(false);
    }
  }

  async activar() {
    const clave = this.clavePublica();
    if (!this.push || !clave || this.trabajando()) {
      return;
    }
    this.trabajando.set(true);
    this.fallo.set(false);
    try {
      const suscripcion = await this.push.requestSubscription({ serverPublicKey: clave });
      await this.registrar(suscripcion);
      this.activo.set(true);
    } catch {
      this.permisoBloqueado.set(Notification.permission === 'denied');
      this.fallo.set(Notification.permission !== 'denied');
    } finally {
      this.trabajando.set(false);
    }
  }

  async desactivar() {
    if (!this.push || this.trabajando()) {
      return;
    }
    this.trabajando.set(true);
    try {
      const suscripcion = await firstValueFrom(this.push.subscription);
      await this.push.unsubscribe();
      if (suscripcion) {
        await firstValueFrom(this.quitar(suscripcion.endpoint));
      }
      this.activo.set(false);
    } catch {
      this.fallo.set(true);
    } finally {
      this.trabajando.set(false);
    }
  }

  async desvincular() {
    if (!this.push || !this.activo()) {
      return;
    }
    try {
      const suscripcion = await firstValueFrom(this.push.subscription);
      if (suscripcion) {
        await firstValueFrom(this.quitar(suscripcion.endpoint));
      }
    } catch {
      return;
    } finally {
      this.activo.set(false);
    }
  }

  private registrar(suscripcion: PushSubscription) {
    const { endpoint, keys } = suscripcion.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    return firstValueFrom(
      this.http.post<void>(`${this.base}/suscripciones`, {
        endpoint,
        keys,
        idioma: this.idioma.actual() === 'en' ? 'en' : 'es',
      }),
    );
  }

  private quitar(endpoint: string) {
    return this.http.delete<void>(`${this.base}/suscripciones`, { body: { endpoint } });
  }
}
