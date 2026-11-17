import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Historial } from '../servicios/historial/historial';
import { ListadoPaginado } from './listado-paginado';
import { recordarPosicion } from './recordar-posicion';

const pagina = (desde: number, hayMas: boolean) => ({
  datos: Array.from({ length: 10 }, (_, i) => ({ _id: `id${desde + i}` })),
  hayMas,
});

@Component({ selector: 'app-prueba', template: '' })
class Prueba {
  readonly listado = new ListadoPaginado<{ _id: string }>((offset) =>
    of(pagina(offset, offset < 50)),
  );
  constructor() {
    recordarPosicion(this.listado);
  }
}

describe('recordarPosicion', () => {
  let historial: Historial;
  let desplazar: ReturnType<typeof vi.fn>;

  const crear = async (posicion?: { y: number; cantidad: number }) => {
    vi.spyOn(historial, 'restaurar').mockReturnValue(posicion);
    const fixture = TestBed.createComponent(Prueba);
    fixture.componentInstance.listado.cargarMas();
    for (let ronda = 0; ronda < 10; ronda++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return fixture;
  };

  beforeEach(() => {
    desplazar = vi.fn();
    vi.stubGlobal('scrollTo', desplazar);
    vi.stubGlobal('requestAnimationFrame', (accion: () => void) => accion());
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    historial = TestBed.inject(Historial);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('[Z] sin posición guardada no carga de más ni se desplaza', async () => {
    const fixture = await crear(undefined);

    expect(fixture.componentInstance.listado.items()).toHaveLength(10);
    expect(desplazar).not.toHaveBeenCalled();
  });

  it('[O] al volver carga las páginas que había y baja hasta donde estaba', async () => {
    const fixture = await crear({ y: 1200, cantidad: 30 });

    expect(fixture.componentInstance.listado.items()).toHaveLength(30);
    expect(desplazar).toHaveBeenCalledTimes(1);
    expect(desplazar).toHaveBeenCalledWith(0, 1200);
  });

  it('[B] si ya estaba toda la primera página, se desplaza sin pedir más', async () => {
    const fixture = await crear({ y: 300, cantidad: 10 });

    expect(fixture.componentInstance.listado.items()).toHaveLength(10);
    expect(desplazar).toHaveBeenCalledWith(0, 300);
  });

  it('[E] si ahora hay menos publicaciones que antes, se desplaza igual con lo que hay', async () => {
    const fixture = await crear({ y: 900, cantidad: 500 });

    expect(fixture.componentInstance.listado.items()).toHaveLength(60);
    expect(desplazar).toHaveBeenCalledTimes(1);
  });

  it('[S] se registra para guardar su posición y se da de baja al destruirse', async () => {
    const registrar = vi.spyOn(historial, 'registrar');
    const fixture = await crear(undefined);

    expect(registrar).toHaveBeenCalledTimes(1);
    const leer = registrar.mock.calls[0][1];
    expect(leer().cantidad).toBe(10);
    fixture.destroy();
  });
});
