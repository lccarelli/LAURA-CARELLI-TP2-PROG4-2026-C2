import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Instalacion } from '../../servicios/instalacion/instalacion';
import { CartelInstalar } from './cartel-instalar';

const eventoDeInstalacion = () =>
  Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });

describe('CartelInstalar', () => {
  const simular = (celular: boolean, iphone = false) => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('max-width') && celular,
    }));
    if (iphone) {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      });
    }
  };

  async function crear() {
    await TestBed.configureTestingModule({
      imports: [CartelInstalar],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    TestBed.inject(Instalacion).iniciar();
    const fixture = TestBed.createComponent(CartelInstalar);
    await fixture.whenStable();
    return fixture;
  }
  const actualizar = async (fixture: Awaited<ReturnType<typeof crear>>) => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('[Z] en la compu no muestra nada', async () => {
    simular(false, true);

    const fixture = await crear();

    expect(fixture.nativeElement.querySelector('.cartel-instalar')).toBeNull();
  });

  it('[O] en un iPhone explica los tres pasos y no ofrece un botón que no podría funcionar', async () => {
    simular(true, true);

    const fixture = await crear();

    const pasos = Array.from(
      fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLElement>,
    );
    expect(pasos.map((paso) => paso.textContent)).toEqual([
      'Tocá Compartir (el cuadrado con la flecha).',
      'Elegí «Agregar a inicio».',
      'Abrila desde el ícono nuevo.',
    ]);
    expect(fixture.nativeElement.querySelector('.boton-principal')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('sin la barra del navegador');
  });

  it('[O] en Android con instalación nativa ofrece el botón y no los pasos', async () => {
    simular(true);
    const fixture = await crear();

    window.dispatchEvent(eventoDeInstalacion());
    await actualizar(fixture);

    expect(fixture.nativeElement.querySelector('.boton-principal').textContent).toContain(
      'Instalar la app',
    );
    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
  });

  it('[S] tocar Instalar abre el cartel nativo del navegador', async () => {
    simular(true);
    const fixture = await crear();
    const evento = eventoDeInstalacion();
    window.dispatchEvent(evento);
    await actualizar(fixture);

    (fixture.nativeElement.querySelector('.boton-principal') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(evento.prompt).toHaveBeenCalledTimes(1);
  });

  it('[S] «Ahora no» lo cierra, y queda recordado', async () => {
    simular(true, true);
    const fixture = await crear();

    (
      fixture.nativeElement.querySelector('button[aria-label="Ahora no"]') as HTMLButtonElement
    ).click();
    await actualizar(fixture);

    expect(fixture.nativeElement.querySelector('.cartel-instalar')).toBeNull();
    expect(localStorage.getItem('instalacion:descartado')).not.toBeNull();
  });

  it('[I] no es un aviso urgente ni bloquea nada: es una sección con nombre, sin role de alerta ni de diálogo', async () => {
    simular(true, true);
    const fixture = await crear();

    const cartel = fixture.nativeElement.querySelector('.cartel-instalar') as HTMLElement;

    expect(cartel.tagName).toBe('SECTION');
    expect(cartel.getAttribute('aria-label')).toBe('Usá Banquete como una app');
    expect(
      fixture.nativeElement.querySelector('[role="alert"], [role="dialog"], [aria-modal]'),
    ).toBeNull();
  });
});
