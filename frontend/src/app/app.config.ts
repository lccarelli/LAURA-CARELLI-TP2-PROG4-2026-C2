import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { cargaInterceptor } from './interceptores/carga-interceptor';
import { reintentoInterceptor } from './interceptores/reintento-interceptor';
import { sesionVencidaInterceptor } from './interceptores/sesion-vencida-interceptor';
import { tokenInterceptor } from './interceptores/token-interceptor';
import { Idioma } from './servicios/idioma/idioma';
import { Instalacion } from './servicios/instalacion/instalacion';
import { Sesion } from './servicios/sesion/sesion';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        cargaInterceptor,
        tokenInterceptor,
        sesionVencidaInterceptor,
        reintentoInterceptor,
      ]),
    ),
    provideTranslateService({ fallbackLang: 'es' }),
    provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
    provideAppInitializer(() => inject(Idioma).iniciar()),
    provideAppInitializer(() => inject(Sesion).iniciar()),
    provideAppInitializer(() => inject(Instalacion).iniciar()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
