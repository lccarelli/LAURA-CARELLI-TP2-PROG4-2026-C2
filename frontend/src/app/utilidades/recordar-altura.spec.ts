import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Historial } from '../servicios/historial/historial';
import { ESPERA_MAXIMA_ALTURA_MS, recordarAltura } from './recordar-posicion';

@Component({ selector: 'app-prueba-altura', template: '' })
class Prueba {
  constructor() {
    recordarAltura();
  }
}

describe('recordarAltura', () => {
  let historial: Historial;
  let desplazar: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;
  let cuadros: (() => void)[];
  let alturaDeLaPagina: number;
  let posicion: number;

  const siguienteCuadro = () => cuadros.splice(0).forEach((cuadro) => cuadro());
  const crear = (y = 1200) => {
    vi.spyOn(historial, 'restaurar').mockReturnValue({ y, cantidad: 0 });
    return TestBed.createComponent(Prueba);
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    cuadros = [];
    alturaDeLaPagina = 3000;
    posicion = 0;
    desplazar = vi.fn<(x: number, y: number) => void>((_x, y) => {
      posicion = y;
    });
    vi.stubGlobal('scrollTo', desplazar);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('requestAnimationFrame', (accion: () => void) => cuadros.push(accion));
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => posicion);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(
      () => alturaDeLaPagina,
    );
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    historial = TestBed.inject(Historial);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('[Z] sin posición guardada no se desplaza', () => {
    vi.spyOn(historial, 'restaurar').mockReturnValue(undefined);

    TestBed.createComponent(Prueba);
    siguienteCuadro();
    siguienteCuadro();

    expect(desplazar).not.toHaveBeenCalled();
  });

  it('[O] si la página ya es lo bastante alta, baja a la altura guardada', () => {
    crear();

    siguienteCuadro();

    expect(desplazar).toHaveBeenCalledWith(0, 1200);
  });

  it('[S] si el contenido todavía no creció, espera y baja cuando alcanza (comentarios que llegan después)', () => {
    alturaDeLaPagina = 900;
    crear();

    siguienteCuadro();
    siguienteCuadro();
    expect(desplazar).not.toHaveBeenCalled();

    alturaDeLaPagina = 2600;
    siguienteCuadro();

    expect(desplazar).toHaveBeenCalledTimes(1);
    expect(desplazar).toHaveBeenCalledWith(0, 1200);
  });

  it('[S] no da por terminado a la primera: si el navegador la devuelve arriba cuando la pantalla se redibuja (la anterior era más larga), la vuelve a bajar', () => {
    crear();
    siguienteCuadro();
    expect(posicion).toBe(1200);

    posicion = 0;
    siguienteCuadro();

    expect(desplazar).toHaveBeenCalledTimes(2);
    expect(posicion).toBe(1200);
  });

  it('[B] una vez en su lugar no insiste: sólo vuelve a bajar si se movió', () => {
    crear();
    siguienteCuadro();
    siguienteCuadro();
    siguienteCuadro();

    expect(desplazar).toHaveBeenCalledTimes(1);
  });

  it('[B] a los 2,5 segundos deja de intentar', () => {
    crear();
    siguienteCuadro();

    vi.setSystemTime(Date.now() + ESPERA_MAXIMA_ALTURA_MS + 1);
    posicion = 0;
    siguienteCuadro();
    siguienteCuadro();

    expect(desplazar).toHaveBeenCalledTimes(1);
    expect(cuadros).toHaveLength(0);
  });

  it.each(['wheel', 'touchstart', 'keydown', 'mousedown'])(
    '[S] si la persona toca la pantalla (%s) deja de moverla',
    (gesto) => {
      crear();
      siguienteCuadro();

      globalThis.dispatchEvent(new Event(gesto));
      posicion = 300;
      siguienteCuadro();

      expect(desplazar).toHaveBeenCalledTimes(1);
      expect(posicion).toBe(300);
    },
  );

  it('[S] si la pantalla se cierra mientras espera, no se desplaza', () => {
    alturaDeLaPagina = 900;
    const fixture = crear();
    siguienteCuadro();

    fixture.destroy();
    alturaDeLaPagina = 3000;
    siguienteCuadro();

    expect(desplazar).not.toHaveBeenCalled();
  });

  it('[S] se registra con la dirección de la pantalla y se da de baja al destruirse', () => {
    const registrar = vi.spyOn(historial, 'registrar');
    const fixture = TestBed.createComponent(Prueba);

    expect(registrar).toHaveBeenCalledWith(TestBed.inject(Router).url, expect.any(Function));
    fixture.destroy();
  });
});
