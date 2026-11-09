import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Icono } from './icono';

@Component({
  imports: [Icono],
  template: `<app-icono [nombre]="nombre" [chico]="chico" [relleno]="relleno" />`,
})
class Anfitrion {
  nombre: 'cerrar' | 'corazon' | 'comentario' = 'cerrar';
  chico = false;
  relleno = false;
}

describe('Icono', () => {
  let fixture: ComponentFixture<Anfitrion>;

  const svg = () => fixture.nativeElement.querySelector('svg') as SVGElement;
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();
    fixture = TestBed.createComponent(Anfitrion);
    await actualizar();
  });

  it('[I] dibuja el trazo del ícono pedido y lo oculta a los lectores de pantalla', () => {
    expect(svg().querySelector('path')!.getAttribute('d')).toBe('M6 6l12 12M18 6L6 18');
    expect(svg().getAttribute('aria-hidden')).toBe('true');
  });

  it('[M] cada nombre dibuja un trazo distinto', async () => {
    const trazos = new Set<string | null>();
    for (const nombre of ['cerrar', 'corazon', 'comentario'] as const) {
      fixture.componentInstance.nombre = nombre;
      fixture = TestBed.createComponent(Anfitrion);
      fixture.componentInstance.nombre = nombre;
      await actualizar();
      trazos.add(svg().querySelector('path')!.getAttribute('d'));
    }

    expect(trazos.size).toBe(3);
  });

  it('[Z] sin indicar nada usa el tamaño normal y sin relleno', () => {
    expect(svg().classList).toContain('icono');
    expect(svg().classList).not.toContain('icono-chico');
    expect(svg().getAttribute('fill')).toBe('none');
  });

  it('[B] chico cambia a la clase del tamaño chico', async () => {
    fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.chico = true;
    await actualizar();

    expect(svg().classList).toContain('icono-chico');
    expect(svg().classList).not.toContain('icono');
  });

  it('[B] relleno pinta el interior con el color del texto', async () => {
    fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.relleno = true;
    await actualizar();

    expect(svg().getAttribute('fill')).toBe('currentColor');
  });
});
