import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { CubreplatoLoading } from './cubreplato-loading';

describe('CubreplatoLoading', () => {
  async function crear(idioma = 'es') {
    await TestBed.configureTestingModule({
      imports: [CubreplatoLoading],
      providers: [proveerIdiomaDePrueba(idioma)],
    }).compileComponents();
    const fixture = TestBed.createComponent(CubreplatoLoading);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('[O] dibuja el cubreplato con tapa, base y vapor', async () => {
    const cubreplato = await crear();

    for (const parte of ['tapa', 'base', 'vapor']) {
      expect(cubreplato.querySelector(`.cubreplato-${parte}`)).not.toBeNull();
    }
  });

  it('[O] avisa con el texto Cargando y el rol de estado', async () => {
    const cubreplato = await crear();

    expect(cubreplato.querySelector('[role="status"]')?.textContent).toContain('Cargando…');
  });

  it('[I] el dibujo no lo lee el lector de pantalla', async () => {
    const cubreplato = await crear();

    expect(cubreplato.querySelector('.cubreplato')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('[I] el texto cambia con el idioma', async () => {
    const cubreplato = await crear('en');

    expect(cubreplato.textContent).toContain('Loading…');
  });
});
