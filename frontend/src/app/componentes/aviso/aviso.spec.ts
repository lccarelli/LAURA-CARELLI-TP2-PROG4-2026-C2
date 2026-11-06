import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Aviso } from './aviso';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

@Component({
  imports: [Aviso],
  template: `<app-aviso titulo="Atención" (cerrar)="cerrado = true">Texto de prueba</app-aviso>`,
})
class Anfitrion {
  cerrado = false;
}

describe('Aviso', () => {
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

  it('[I] se anuncia como alerta y no bloquea la página', async () => {
    const fixture = await crear();
    const aviso = fixture.nativeElement.querySelector('[role="alert"]');

    expect(aviso).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-modal]')).toBeNull();
  });

  it('[I] la variante informativa se anuncia como estado y no como alerta', async () => {
    await TestBed.configureTestingModule({
      imports: [Aviso],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Aviso);
    fixture.componentRef.setInput('info', true);
    await fixture.whenStable();

    const aviso = fixture.nativeElement.querySelector('.aviso') as HTMLElement;
    expect(aviso.getAttribute('role')).toBe('status');
    expect(aviso.classList).toContain('aviso-info');
  });

  it('[S] el botón de cerrar avisa que se cerró', async () => {
    const fixture = await crear();

    fixture.nativeElement.querySelector('button').click();

    expect(fixture.componentInstance.cerrado).toBe(true);
  });
});
