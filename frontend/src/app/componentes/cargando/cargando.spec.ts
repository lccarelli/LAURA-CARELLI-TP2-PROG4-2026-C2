import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Carga, RETRASO_MS } from '../../servicios/carga/carga';
import { Cargando } from './cargando';

describe('Cargando', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [Cargando],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Cargando);
    await fixture.whenStable();
    return fixture;
  }
  const actualizar = async (fixture: Awaited<ReturnType<typeof crear>>) => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
  afterEach(() => vi.useRealTimers());

  it('[Z] sin espera no dibuja nada', async () => {
    const fixture = await crear();

    expect(fixture.nativeElement.querySelector('.cargando-global')).toBeNull();
  });

  it('[O] con una espera visible dibuja el logo animado y el mensaje, en el centro de la pantalla', async () => {
    const fixture = await crear();
    TestBed.inject(Carga).iniciar({ clave: 'carga.publicando' });
    vi.advanceTimersByTime(RETRASO_MS);
    await actualizar(fixture);

    const capa = fixture.nativeElement.querySelector('.cargando-global') as HTMLElement;

    expect(capa.querySelector('app-logo-cargando svg')).not.toBeNull();
    expect(capa.textContent).toContain('Guardando tu publicación…');
  });

  it('[I] avisa a los lectores de pantalla sin interrumpir', async () => {
    const fixture = await crear();
    TestBed.inject(Carga).iniciar();
    vi.advanceTimersByTime(RETRASO_MS);
    await actualizar(fixture);

    const capa = fixture.nativeElement.querySelector('.cargando-global') as HTMLElement;

    expect(capa.getAttribute('role')).toBe('status');
    expect(capa.getAttribute('aria-live')).toBe('polite');
    expect(capa.getAttribute('aria-busy')).toBe('true');
  });

  it('[S] la nota larga aparece después de unos segundos', async () => {
    const fixture = await crear();
    TestBed.inject(Carga).iniciar({
      clave: 'carga.ingresando',
      nota: 'carga.despertando',
      segundosHastaNota: 4,
    });
    vi.advanceTimersByTime(RETRASO_MS);
    await actualizar(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Puede tardar hasta un minuto');

    vi.advanceTimersByTime(4000);
    await actualizar(fixture);

    expect(fixture.nativeElement.textContent).toContain('Puede tardar hasta un minuto');
  });

  it('[S] al terminar la espera desaparece', async () => {
    const fixture = await crear();
    const carga = TestBed.inject(Carga);
    const id = carga.iniciar();
    vi.advanceTimersByTime(RETRASO_MS + 1000);
    await actualizar(fixture);

    carga.terminar(id);
    vi.advanceTimersByTime(1);
    await actualizar(fixture);

    expect(fixture.nativeElement.querySelector('.cargando-global')).toBeNull();
  });
});
