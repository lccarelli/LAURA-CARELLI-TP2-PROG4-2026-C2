import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Ventana } from './ventana';

@Component({
  imports: [Ventana],
  template: `<app-ventana titulo="comun.aviso" [escape]="escape()" (cerrar)="cierres = cierres + 1"
    ><input data-foco /><button class="aparte">Otro</button></app-ventana
  >`,
})
class Anfitrion {
  cierres = 0;
  escape = signal(true);
}

describe('Ventana', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Anfitrion);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture;
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('[Z] muestra su título y el contenido que se le pasa', async () => {
    const fixture = await crear();
    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Aviso');
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
  });

  it('[I] se anuncia como un diálogo modal', async () => {
    const fixture = await crear();
    const dialogo = fixture.nativeElement.querySelector('[role="dialog"]');

    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(dialogo.getAttribute('aria-label')).toBe('Aviso');
  });

  it('[O] la X avisa que se quiere cerrar', async () => {
    const fixture = await crear();

    fixture.nativeElement.querySelector('.ventana-cabecera button').click();

    expect(fixture.componentInstance.cierres).toBe(1);
  });

  it('[I] Escape avisa que se quiere cerrar', async () => {
    const fixture = await crear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(fixture.componentInstance.cierres).toBe(1);
  });

  it('[B] si se le indica, Escape no la cierra', async () => {
    const fixture = await crear();
    fixture.componentInstance.escape.set(false);
    await fixture.whenStable();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(fixture.componentInstance.cierres).toBe(0);
  });

  it('[B] un clic en el fondo no la cierra', async () => {
    const fixture = await crear();

    fixture.nativeElement.querySelector('.velo').click();

    expect(fixture.componentInstance.cierres).toBe(0);
  });

  it('[S] al abrirse, el foco va al campo marcado', async () => {
    const fixture = await crear();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input'));
  });

  it('[E] si no hay campo marcado, el foco va a la propia ventana', async () => {
    await TestBed.configureTestingModule({
      imports: [Ventana],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Ventana);
    fixture.componentRef.setInput('titulo', 'comun.aviso');
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.ventana'));
  });
});
