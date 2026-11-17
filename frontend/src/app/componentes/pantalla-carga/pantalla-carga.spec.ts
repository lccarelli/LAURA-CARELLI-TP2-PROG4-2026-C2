import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { PantallaCarga, SEGUNDOS_HASTA_AVISO } from './pantalla-carga';

describe('PantallaCarga', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [PantallaCarga],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(PantallaCarga);
    fixture.detectChanges();
    return fixture;
  }

  const pasar = (fixture: Awaited<ReturnType<typeof crear>>, segundos: number) => {
    vi.advanceTimersByTime(segundos * 1000);
    fixture.detectChanges();
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('[O] muestra el logo animado de Banquete y el mensaje de que se está abriendo', async () => {
    const fixture = await crear();
    const pantalla: HTMLElement = fixture.nativeElement;

    expect(pantalla.querySelector('app-logo-cargando svg')).not.toBeNull();
    expect(pantalla.textContent).toContain('Abriendo Banquete…');
    expect(pantalla.querySelector('[role="status"]')).not.toBeNull();
  });

  it('[Z] al principio no avisa que el servidor se está despertando', async () => {
    const fixture = await crear();

    expect(fixture.nativeElement.textContent).not.toContain('despertando');
  });

  it('[B] justo antes del plazo no avisa, y en el plazo sí', async () => {
    const fixture = await crear();

    pasar(fixture, SEGUNDOS_HASTA_AVISO - 1);
    expect(fixture.nativeElement.textContent).not.toContain('despertando');

    pasar(fixture, 1);
    expect(fixture.nativeElement.textContent).toContain('despertando');
  });

  it('[S] si se cierra antes del plazo, no queda ningún temporizador', async () => {
    const fixture = await crear();

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
