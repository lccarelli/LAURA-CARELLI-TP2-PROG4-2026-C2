import { Component, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutoFoco } from './auto-foco';

@Component({ imports: [AutoFoco], template: `<input id="campo" appAutoFoco />` })
class ConCampo {}

@Component({ imports: [AutoFoco], template: `<textarea id="campo" appAutoFoco></textarea>` })
class ConArea {}

@Component({ imports: [AutoFoco], template: `<button id="campo" appAutoFoco>Cancelar</button>` })
class ConBoton {}

@Component({
  imports: [AutoFoco],
  template: `<input id="campo" [appAutoFoco]="activo()" />`,
})
class ConInterruptor {
  readonly activo = signal(false);
}

@Component({
  imports: [AutoFoco],
  template: `@if (visible()) {
    <input id="campo" appAutoFoco />
  }`,
})
class Condicional {
  readonly visible = signal(false);
}

describe('AutoFoco', () => {
  const conPantalla = (tactil: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn((consulta: string) => ({ matches: tactil && consulta === '(pointer: coarse)' })),
    );

  async function crear<T>(componente: Type<T>) {
    await TestBed.configureTestingModule({ imports: [componente] }).compileComponents();
    const fixture = TestBed.createComponent(componente);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture;
  }

  const enfocado = () => document.activeElement?.id;

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('[O] un campo de texto recibe el foco al aparecer, con el mouse', async () => {
    conPantalla(false);
    await crear(ConCampo);

    expect(enfocado()).toBe('campo');
  });

  it('[O] un área de texto también', async () => {
    conPantalla(false);
    await crear(ConArea);

    expect(enfocado()).toBe('campo');
  });

  it('[O] un elemento que aparece después, por una condición, recibe el foco en ese momento', async () => {
    conPantalla(false);
    const fixture = await crear(Condicional);
    expect(enfocado()).not.toBe('campo');

    fixture.componentInstance.visible.set(true);
    await fixture.whenStable();

    expect(enfocado()).toBe('campo');
  });

  it('[S] en un teléfono no enfoca un campo de texto, para no abrir el teclado sin que se pida', async () => {
    conPantalla(true);
    await crear(ConCampo);

    expect(enfocado()).not.toBe('campo');
  });

  it('[S] en un teléfono tampoco enfoca un área de texto', async () => {
    conPantalla(true);
    await crear(ConArea);

    expect(enfocado()).not.toBe('campo');
  });

  it('[S] en un teléfono sí enfoca un botón, porque no abre el teclado', async () => {
    conPantalla(true);
    await crear(ConBoton);

    expect(enfocado()).toBe('campo');
  });

  it('[B] con el atributo en falso no enfoca nada', async () => {
    conPantalla(false);
    await crear(ConInterruptor);

    expect(enfocado()).not.toBe('campo');
  });

  it('[Z] si el navegador no tiene matchMedia, enfoca igual', async () => {
    vi.stubGlobal('matchMedia', undefined);
    await crear(ConCampo);

    expect(enfocado()).toBe('campo');
  });
});
