import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tipo } from '../../interfaces/publicacion';
import { PortadaGenerica } from './portada-generica';

describe('PortadaGenerica', () => {
  let fixture: ComponentFixture<PortadaGenerica>;

  const crear = async (tipo: Tipo, chica = false) => {
    await TestBed.configureTestingModule({ imports: [PortadaGenerica] }).compileComponents();
    fixture = TestBed.createComponent(PortadaGenerica);
    fixture.componentRef.setInput('tipo', tipo);
    fixture.componentRef.setInput('chica', chica);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it.each(['receta', 'tip', 'experiencia'] as const)(
    '[O] dibuja una ilustración para el tipo %s',
    async (tipo) => {
      const raiz = await crear(tipo);

      expect(raiz.querySelector('.portada-generica')!.getAttribute('data-tipo')).toBe(tipo);
      expect(raiz.querySelectorAll('svg.portada-generica-dibujo path').length).toBeGreaterThan(0);
    },
  );

  it('[I] cada tipo tiene un dibujo distinto', async () => {
    const dibujos = new Set<string>();
    for (const tipo of ['receta', 'tip', 'experiencia'] as const) {
      TestBed.resetTestingModule();
      const raiz = await crear(tipo);
      dibujos.add(raiz.querySelector('svg')!.innerHTML.replace(/<!--.*?-->/g, ''));
    }

    expect(dibujos.size).toBe(3);
  });

  it('[I] es decorativa: el SVG está oculto para los lectores de pantalla', async () => {
    const raiz = await crear('receta');

    expect(raiz.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('[I] no escribe colores en la plantilla: salen de la paleta, así sigue el tema', async () => {
    const raiz = await crear('tip');

    expect(raiz.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\bfill="[^n]/);
  });

  it('[O] el tamaño chico (miniatura) y el grande se eligen con la entrada `chica`', async () => {
    const grande = await crear('receta', false);
    expect(grande.querySelector('.portada-generica-chica')).toBeNull();

    TestBed.resetTestingModule();
    const chica = await crear('receta', true);
    expect(chica.querySelector('.portada-generica.portada-generica-chica')).not.toBeNull();
  });

  it('[S] las partes de acento llevan su clase, para darles un tono más suave que el resto del dibujo', async () => {
    const receta = await crear('receta');
    expect(receta.querySelector('.portada-generica-acento')).not.toBeNull();

    TestBed.resetTestingModule();
    const experiencia = await crear('experiencia');
    expect(experiencia.querySelector('.portada-generica-relleno')).not.toBeNull();
  });
});
