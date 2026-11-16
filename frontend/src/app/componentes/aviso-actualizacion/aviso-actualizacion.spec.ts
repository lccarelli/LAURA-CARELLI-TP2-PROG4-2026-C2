import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Actualizacion } from '../../servicios/actualizacion/actualizacion';
import { AvisoActualizacion } from './aviso-actualizacion';

describe('AvisoActualizacion', () => {
  const hayNueva = signal(false);
  const aplicar = vi.fn();

  async function crear() {
    await TestBed.configureTestingModule({
      imports: [AvisoActualizacion],
      providers: [
        proveerIdiomaDePrueba(),
        { provide: Actualizacion, useValue: { hayNueva, aplicar } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AvisoActualizacion);
    await fixture.whenStable();
    return fixture;
  }

  const boton = (fixture: { nativeElement: HTMLElement }, texto: string) =>
    Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    );

  beforeEach(() => {
    hayNueva.set(false);
    aplicar.mockClear();
  });

  it('[Z] sin versión nueva no muestra nada', async () => {
    const fixture = await crear();

    expect(fixture.nativeElement.querySelector('app-aviso')).toBeNull();
  });

  it('[O] con una versión nueva avisa y ofrece actualizar', async () => {
    hayNueva.set(true);
    const fixture = await crear();

    expect(fixture.nativeElement.textContent).toContain('Hay una versión nueva');
    expect(boton(fixture, 'Actualizar ahora')).toBeDefined();
  });

  it('[O] Actualizar ahora aplica la versión nueva', async () => {
    hayNueva.set(true);
    const fixture = await crear();

    boton(fixture, 'Actualizar ahora')!.click();

    expect(aplicar).toHaveBeenCalledTimes(1);
  });

  it('[S] cerrar el aviso lo oculta sin actualizar', async () => {
    hayNueva.set(true);
    const fixture = await crear();

    (fixture.nativeElement.querySelector('.boton-icono') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-aviso')).toBeNull();
    expect(aplicar).not.toHaveBeenCalled();
  });
});
