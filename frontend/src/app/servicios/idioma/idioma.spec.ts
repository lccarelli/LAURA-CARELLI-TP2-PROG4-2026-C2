import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Idioma } from './idioma';

describe('Idioma', () => {
  const navegadorEn = (idioma: string) =>
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(idioma);

  const crear = () => {
    TestBed.configureTestingModule({ providers: [proveerIdiomaDePrueba()] });
    return TestBed.inject(Idioma);
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    navegadorEn('es-AR');
  });

  afterEach(() => vi.restoreAllMocks());

  it('[Z] sin nada guardado y con un navegador en otro idioma, arranca en español', async () => {
    navegadorEn('fr-FR');
    const idioma = crear();

    await firstValueFrom(idioma.iniciar());

    expect(idioma.actual()).toBe('es');
  });

  it('[O] con el navegador en inglés, arranca en inglés', async () => {
    navegadorEn('en-US');
    const idioma = crear();

    await firstValueFrom(idioma.iniciar());

    expect(idioma.actual()).toBe('en');
  });

  it('[M] el idioma guardado gana sobre el del navegador', async () => {
    navegadorEn('en-US');
    localStorage.setItem('idioma', 'es');
    const idioma = crear();

    await firstValueFrom(idioma.iniciar());

    expect(idioma.actual()).toBe('es');
  });

  it('[B] un idioma guardado que no existe se ignora', async () => {
    navegadorEn('fr-FR');
    localStorage.setItem('idioma', 'klingon');
    const idioma = crear();

    await firstValueFrom(idioma.iniciar());

    expect(idioma.actual()).toBe('es');
  });

  it('[S] cambiar de idioma lo guarda y actualiza el idioma de la página', async () => {
    const idioma = crear();
    await firstValueFrom(idioma.iniciar());

    idioma.cambiar('en');
    TestBed.tick();

    expect(idioma.actual()).toBe('en');
    expect(localStorage.getItem('idioma')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('[E] un idioma que no existe no cambia nada', async () => {
    const idioma = crear();
    await firstValueFrom(idioma.iniciar());

    idioma.cambiar('klingon');

    expect(idioma.actual()).toBe('es');
    expect(localStorage.getItem('idioma')).toBeNull();
  });

  it('[E] si no se puede guardar, igual cambia de idioma', async () => {
    const idioma = crear();
    await firstValueFrom(idioma.iniciar());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sin almacenamiento');
    });

    idioma.cambiar('en');

    expect(idioma.actual()).toBe('en');
  });
});
