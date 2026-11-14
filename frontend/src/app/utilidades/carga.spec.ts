import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Carga } from './carga';

describe('Carga', () => {
  let carga: Carga<number[]>;
  let origen: Subject<number[]>;

  beforeEach(() => {
    carga = new Carga<number[]>((numeros) => numeros.length === 0);
    origen = new Subject<number[]>();
  });

  it('[Z] al crearla no hay datos, ni carga, ni error', () => {
    expect(carga.estado()).toBe('ninguno');
    expect(carga.datos()).toBeNull();
    expect(carga.mensajeError()).toBeNull();
  });

  it('[O] mientras espera está cargando', () => {
    carga.cargar(origen);

    expect(carga.estado()).toBe('cargando');
  });

  it('[O] con datos queda en "datos" y los guarda', () => {
    carga.cargar(origen);

    origen.next([1, 2]);

    expect(carga.estado()).toBe('datos');
    expect(carga.datos()).toEqual([1, 2]);
  });

  it('[O] con datos que cuentan como vacíos queda en "vacio"', () => {
    carga.cargar(origen);

    origen.next([]);

    expect(carga.estado()).toBe('vacio');
  });

  it('[E] si falla guarda el motivo y deja de cargar', () => {
    carga.cargar(origen);

    origen.error(new HttpErrorResponse({ status: 403, error: { codigo: 'NO_ES_ADMINISTRADOR' } }));

    expect(carga.mensajeError()).toBe('api.NO_ES_ADMINISTRADOR');
    expect(carga.cargando()).toBe(false);
  });

  it('[S] al volver a cargar borra el error anterior', () => {
    carga.cargar(origen);
    origen.error(new HttpErrorResponse({ status: 500 }));

    carga.cargar(new Subject<number[]>());

    expect(carga.mensajeError()).toBeNull();
    expect(carga.estado()).toBe('cargando');
  });

  it('[S] al volver a cargar cancela el pedido anterior', () => {
    carga.cargar(origen);

    carga.cargar(new Subject<number[]>());

    expect(origen.observed).toBe(false);
  });

  it('[I] detener cancela el pedido y deja de cargar', () => {
    carga.cargar(origen);

    carga.detener();

    expect(origen.observed).toBe(false);
    expect(carga.cargando()).toBe(false);
  });

  it('[S] después de un error, con datos de antes, se siguen mostrando', () => {
    carga.cargar(origen);
    origen.next([1]);

    carga.cargar(new Subject<number[]>());
    carga.detener();

    expect(carga.estado()).toBe('datos');
  });
});
