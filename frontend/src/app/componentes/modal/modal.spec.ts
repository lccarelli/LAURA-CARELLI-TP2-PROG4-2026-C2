import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

@Component({
  imports: [Modal],
  template: `<app-modal titulo="Atención" (cerrar)="cerrado = true">Texto de prueba</app-modal>`,
})
class Anfitrion {
  cerrado = false;
}

describe('Modal', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    return fixture;
  }

  it('[O] muestra el título y el mensaje', async () => {
    const fixture = await crear();
    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Atención');
    expect(texto).toContain('Texto de prueba');
  });

  it('[I] se anuncia como un diálogo modal', async () => {
    const fixture = await crear();
    const dialogo = fixture.nativeElement.querySelector('[role="dialog"]');

    expect(dialogo.getAttribute('aria-modal')).toBe('true');
  });

  it('[S] el botón Aceptar avisa que se cerró', async () => {
    const fixture = await crear();

    fixture.nativeElement.querySelector('button').click();

    expect(fixture.componentInstance.cerrado).toBe(true);
  });
});
