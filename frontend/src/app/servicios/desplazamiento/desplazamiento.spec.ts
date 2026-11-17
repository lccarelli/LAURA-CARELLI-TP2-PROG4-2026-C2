import { TestBed } from '@angular/core/testing';
import {
  Desplazamiento,
  DESPLAZAMIENTO_MINIMO,
  ZONA_DEL_FINAL,
  ZONA_DEL_TOPE,
} from './desplazamiento';

describe('Desplazamiento', () => {
  const desplazarA = (posicion: number) => {
    Object.defineProperty(window, 'scrollY', { value: posicion, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  };
  const medidas = (alto: number, ventana: number) => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: alto,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', { value: ventana, configurable: true });
  };

  beforeEach(() => {
    desplazarA(0);
    medidas(3000, 800);
  });

  afterEach(() => {
    desplazarA(0);
    medidas(0, 768);
  });

  it('[Z] al empezar está arriba de todo: se muestra', () => {
    const servicio = TestBed.inject(Desplazamiento);

    expect(servicio.enElTope()).toBe(true);
    expect(servicio.mostrar()).toBe(true);
  });

  it('[O] al bajar se oculta y al subir se muestra', () => {
    const servicio = TestBed.inject(Desplazamiento);

    desplazarA(500);
    expect(servicio.mostrar()).toBe(false);

    desplazarA(400);
    expect(servicio.mostrar()).toBe(true);
  });

  it.each([
    [ZONA_DEL_TOPE, true],
    [ZONA_DEL_TOPE + 1, false],
  ])('[B] a %i px del tope, mostrar es %s', (posicion, visible) => {
    const servicio = TestBed.inject(Desplazamiento);

    desplazarA(posicion);

    expect(servicio.mostrar()).toBe(visible);
  });

  it.each([
    [DESPLAZAMIENTO_MINIMO - 1, false],
    [DESPLAZAMIENTO_MINIMO, true],
  ])('[B] subir %i px: se muestra = %s (los movimientos chicos no cuentan)', (subida, cuenta) => {
    const servicio = TestBed.inject(Desplazamiento);
    desplazarA(1000);

    desplazarA(1000 - subida);

    expect(servicio.mostrar()).toBe(cuenta);
  });

  it('[I] al llegar al final de la página se muestra aunque se esté bajando', () => {
    const servicio = TestBed.inject(Desplazamiento);
    desplazarA(1000);

    desplazarA(3000 - 800 - ZONA_DEL_FINAL);

    expect(servicio.enElFinal()).toBe(true);
    expect(servicio.mostrar()).toBe(true);
  });

  it('[Z] en una página que no se desplaza nunca está "al final"', () => {
    medidas(600, 800);
    const servicio = TestBed.inject(Desplazamiento);

    desplazarA(300);

    expect(servicio.enElFinal()).toBe(false);
  });

  it('[E] un desplazamiento negativo (rebote de iOS) se toma como el tope', () => {
    const servicio = TestBed.inject(Desplazamiento);
    desplazarA(500);

    desplazarA(-30);

    expect(servicio.enElTope()).toBe(true);
    expect(servicio.mostrar()).toBe(true);
  });
});
