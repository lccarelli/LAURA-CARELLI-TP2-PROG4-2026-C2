import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Idioma } from '../../servicios/idioma/idioma';
import { CampoClave } from './campo-clave';

@Component({
  imports: [CampoClave],
  template: `<app-campo-clave><input class="campo" type="password" /></app-campo-clave>`,
})
class Anfitrion {}

@Component({
  imports: [CampoClave],
  template: `<app-campo-clave />`,
})
class AnfitrionSinCampo {}

describe('CampoClave', () => {
  async function crear<T>(componente: new () => T) {
    await TestBed.configureTestingModule({
      imports: [componente],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(componente);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      campo: () => raiz.querySelector('input') as HTMLInputElement,
      boton: () => raiz.querySelector('button') as HTMLButtonElement,
    };
  }

  it('[Z] por defecto la clave está oculta', async () => {
    const { campo, boton } = await crear(Anfitrion);

    expect(campo().type).toBe('password');
    expect(boton().getAttribute('aria-pressed')).toBe('false');
  });

  it('[O] al pulsar el ojo se ve lo que se escribe', async () => {
    const { campo, boton, fixture } = await crear(Anfitrion);

    boton().click();
    await fixture.whenStable();

    expect(campo().type).toBe('text');
    expect(boton().getAttribute('aria-pressed')).toBe('true');
  });

  it('[M] al pulsar dos veces vuelve a ocultarse', async () => {
    const { campo, boton, fixture } = await crear(Anfitrion);

    boton().click();
    await fixture.whenStable();
    boton().click();
    await fixture.whenStable();

    expect(campo().type).toBe('password');
  });

  it('[S] lo escrito no se pierde al mostrar u ocultar', async () => {
    const { campo, boton, fixture } = await crear(Anfitrion);
    campo().value = 'Clave1234';

    boton().click();
    await fixture.whenStable();

    expect(campo().value).toBe('Clave1234');
  });

  it('[I] el botón dice qué hace, en el idioma actual', async () => {
    const { boton, fixture } = await crear(Anfitrion);
    expect(boton().getAttribute('aria-label')).toBe('Mostrar clave');

    boton().click();
    await fixture.whenStable();
    expect(boton().getAttribute('aria-label')).toBe('Ocultar clave');

    TestBed.inject(Idioma).cambiar('en');
    await fixture.whenStable();
    expect(boton().getAttribute('aria-label')).toBe('Hide password');
  });

  it('[E] sin un campo adentro, pulsar el ojo no falla', async () => {
    const { boton, fixture } = await crear(AnfitrionSinCampo);

    expect(() => boton().click()).not.toThrow();
    await fixture.whenStable();

    expect(boton().getAttribute('aria-pressed')).toBe('true');
  });
});
