import { TestBed } from '@angular/core/testing';
import { Tema } from './tema';

describe('Tema', () => {
  const sistemaOscuro = (oscuro: boolean) =>
    vi.stubGlobal('matchMedia', () => ({ matches: oscuro }));

  const crear = () => TestBed.inject(Tema);
  const atributo = () => document.documentElement.dataset['tema'];

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['tema'];
    sistemaOscuro(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('[Z] sin nada guardado y con el sistema en claro, arranca en claro', () => {
    const tema = crear();

    expect(tema.actual()).toBe('claro');
    expect(atributo()).toBe('claro');
  });

  it('[O] con el sistema en modo oscuro, arranca en oscuro', () => {
    sistemaOscuro(true);
    const tema = crear();

    expect(tema.actual()).toBe('oscuro');
    expect(atributo()).toBe('oscuro');
  });

  it('[M] lo que eligió la persona gana sobre el sistema', () => {
    sistemaOscuro(true);
    localStorage.setItem('tema', 'claro');
    const tema = crear();

    expect(tema.actual()).toBe('claro');
  });

  it('[B] un valor guardado que no existe se ignora', () => {
    localStorage.setItem('tema', 'fucsia');
    const tema = crear();

    expect(tema.actual()).toBe('claro');
  });

  it('[S] alternar cambia el modo, lo guarda y lo aplica a la página', () => {
    const tema = crear();

    tema.alternar();

    expect(tema.actual()).toBe('oscuro');
    expect(localStorage.getItem('tema')).toBe('oscuro');
    expect(atributo()).toBe('oscuro');

    tema.alternar();

    expect(tema.actual()).toBe('claro');
    expect(atributo()).toBe('claro');
  });

  it('[E] si no se puede guardar, igual cambia de modo', () => {
    const tema = crear();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sin almacenamiento');
    });

    tema.alternar();

    expect(tema.actual()).toBe('oscuro');
    expect(atributo()).toBe('oscuro');
  });

  it('[E] si el navegador no sabe de matchMedia, arranca en claro', () => {
    vi.stubGlobal('matchMedia', undefined);
    const tema = crear();

    expect(tema.actual()).toBe('claro');
  });
});
