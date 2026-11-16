import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Resaltar } from './resaltar';

@Component({
  imports: [Resaltar],
  template: `<p [appResaltar]="color()">Receta</p>
    <span appResaltar>Sin color</span>`,
})
class Anfitrion {
  readonly color = signal('var(--tema-primario)');
}

describe('Resaltar', () => {
  async function crear() {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const elemento = (selector: string) =>
      fixture.debugElement.query(By.css(selector)).nativeElement as HTMLElement;
    return { fixture, elemento };
  }

  const pasarElMouse = async (
    fixture: { whenStable: () => Promise<unknown> },
    elemento: HTMLElement,
    evento: 'mouseenter' | 'mouseleave',
  ) => {
    elemento.dispatchEvent(new Event(evento));
    await fixture.whenStable();
  };

  it('[Z] sin el mouse encima no está resaltado', async () => {
    const { elemento } = await crear();

    expect(elemento('p').classList).not.toContain('resaltado');
  });

  it('[O] al pasar el mouse se resalta y al sacarlo vuelve a la normalidad', async () => {
    const { fixture, elemento } = await crear();

    await pasarElMouse(fixture, elemento('p'), 'mouseenter');
    expect(elemento('p').classList).toContain('resaltado');

    await pasarElMouse(fixture, elemento('p'), 'mouseleave');
    expect(elemento('p').classList).not.toContain('resaltado');
  });

  it('[O] el color que se le pasa llega a la plantilla de estilos', async () => {
    const { elemento } = await crear();

    expect(elemento('p').style.getPropertyValue('--color-resaltado')).toBe('var(--tema-primario)');
  });

  it('[S] si el color cambia, el resaltado usa el nuevo', async () => {
    const { fixture, elemento } = await crear();

    fixture.componentInstance.color.set('var(--tema-acento)');
    await fixture.whenStable();

    expect(elemento('p').style.getPropertyValue('--color-resaltado')).toBe('var(--tema-acento)');
  });

  it('[B] sin color no escribe nada y se usa el color por defecto del estilo', async () => {
    const { fixture, elemento } = await crear();

    await pasarElMouse(fixture, elemento('span'), 'mouseenter');

    expect(elemento('span').classList).toContain('resaltado');
    expect(elemento('span').style.getPropertyValue('--color-resaltado')).toBe('');
  });

  it('[S] cada elemento se resalta por separado', async () => {
    const { fixture, elemento } = await crear();

    await pasarElMouse(fixture, elemento('p'), 'mouseenter');

    expect(elemento('span').classList).not.toContain('resaltado');
  });
});
