import { TestBed } from '@angular/core/testing';
import { LogoCargando } from './logo-cargando';

describe('LogoCargando', () => {
  async function crear() {
    await TestBed.configureTestingModule({ imports: [LogoCargando] }).compileComponents();
    const fixture = TestBed.createComponent(LogoCargando);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('[O] dibuja el logo con las tres piezas que se mueven: la cuchara, el punto y el aro', async () => {
    const logo = await crear();

    expect(logo.querySelector('svg .bq-spoon')).not.toBeNull();
    expect(logo.querySelector('svg .bq-dot')).not.toBeNull();
    expect(logo.querySelector('svg .bq-ring')).not.toBeNull();
  });

  it('[I] es decorativo: el texto de la espera lo da quien lo usa', async () => {
    const logo = await crear();

    expect(logo.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('[I] los colores no están escritos en la plantilla: salen de la hoja de estilos', async () => {
    const logo = await crear();

    expect(logo.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(logo.querySelector('[fill]:not([fill="none"])')).toBeNull();
  });
});
