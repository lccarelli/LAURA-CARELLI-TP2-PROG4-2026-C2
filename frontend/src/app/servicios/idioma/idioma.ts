import { effect, inject, Service } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const IDIOMA_POR_DEFECTO = 'es';

@Service()
export class Idioma {
  private traductor = inject(TranslateService);

  readonly disponibles = ['es', 'en'];
  readonly actual = this.traductor.currentLang;

  constructor() {
    effect(() => {
      document.documentElement.lang = this.actual() ?? IDIOMA_POR_DEFECTO;
    });
  }

  iniciar() {
    return this.traductor.use(this.guardado() ?? this.delNavegador());
  }

  cambiar(idioma: string) {
    if (!this.disponibles.includes(idioma)) {
      return;
    }
    this.guardar(idioma);
    this.traductor.use(idioma).subscribe();
  }

  private guardar(idioma: string) {
    try {
      localStorage.setItem('idioma', idioma);
    } catch {
      return;
    }
  }

  private guardado() {
    try {
      const idioma = localStorage.getItem('idioma');
      return idioma && this.disponibles.includes(idioma) ? idioma : null;
    } catch {
      return null;
    }
  }

  private delNavegador() {
    const idioma = navigator.language.slice(0, 2);
    return this.disponibles.includes(idioma) ? idioma : IDIOMA_POR_DEFECTO;
  }
}
