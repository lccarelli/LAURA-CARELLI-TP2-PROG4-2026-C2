import { Provider } from '@angular/core';
import { provideTranslateService, TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { of } from 'rxjs';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/es.json';

const traducciones: Record<string, TranslationObject> = { es, en };

class CargadorDePrueba implements TranslateLoader {
  getTranslation(idioma: string) {
    return of(traducciones[idioma]);
  }
}

export function proveerIdiomaDePrueba(idioma = 'es'): Provider[] {
  return provideTranslateService({
    lang: idioma,
    fallbackLang: 'es',
    loader: CargadorDePrueba,
  });
}
