import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { ListadoPaginado } from './listado-paginado';

interface Elemento {
  _id: string;
}

const pagina = (ids: string[], hayMas = false) => ({
  datos: ids.map((_id) => ({ _id })),
  hayMas,
});

describe('ListadoPaginado', () => {
  let respuestas: Subject<ReturnType<typeof pagina>>[];
  let pedidos: number[];
  let listado: ListadoPaginado<Elemento>;

  const responder = (ids: string[], hayMas = false) => respuestas.at(-1)!.next(pagina(ids, hayMas));
  const ids = () => listado.items().map(({ _id }) => _id);

  beforeEach(() => {
    respuestas = [];
    pedidos = [];
    listado = new ListadoPaginado<Elemento>((offset) => {
      pedidos.push(offset);
      const respuesta = new Subject<ReturnType<typeof pagina>>();
      respuestas.push(respuesta);
      return respuesta;
    });
  });

  it('[Z] antes de pedir no hay nada cargado ni cargando', () => {
    expect(ids()).toEqual([]);
    expect(listado.cargando()).toBe(false);
    expect(listado.hayMas()).toBe(false);
    expect(pedidos).toEqual([]);
  });

  it('[O] pedir pide desde 0, marca cargando y al llegar guarda los datos', () => {
    listado.cargarMas();
    expect(listado.cargando()).toBe(true);

    responder(['a', 'b'], true);

    expect(pedidos).toEqual([0]);
    expect(ids()).toEqual(['a', 'b']);
    expect(listado.hayMas()).toBe(true);
    expect(listado.cargando()).toBe(false);
  });

  it('[M] la página siguiente se pide desde lo ya cargado y se suma a lo anterior', () => {
    listado.cargarMas();
    responder(['a', 'b'], true);

    listado.cargarMas();
    responder(['c'], false);

    expect(pedidos).toEqual([0, 2]);
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(listado.hayMas()).toBe(false);
  });

  it('[M] no repite lo que ya estaba', () => {
    listado.cargarMas();
    responder(['a', 'b'], true);

    listado.cargarMas();
    responder(['b', 'c']);

    expect(ids()).toEqual(['a', 'b', 'c']);
  });

  it('[S] mientras espera una página no pide otra', () => {
    listado.cargarMas();
    listado.cargarMas();

    expect(pedidos).toEqual([0]);
  });

  it('[E] si falla guarda el mensaje, marca la falla y conserva lo cargado', () => {
    listado.cargarMas();
    responder(['a'], true);

    listado.cargarMas();
    respuestas
      .at(-1)!
      .error(new HttpErrorResponse({ status: 403, error: { codigo: 'NO_ES_ADMINISTRADOR' } }));

    expect(listado.mensajeError()).toBe('api.NO_ES_ADMINISTRADOR');
    expect(listado.fallaLaCarga()).toBe(true);
    expect(listado.cargando()).toBe(false);
    expect(ids()).toEqual(['a']);
  });

  it('[E] después de una falla, volver a pedir limpia la marca de falla', () => {
    listado.cargarMas();
    respuestas.at(-1)!.error(new HttpErrorResponse({ status: 0 }));

    listado.cargarMas();
    responder(['a']);

    expect(listado.fallaLaCarga()).toBe(false);
    expect(ids()).toEqual(['a']);
  });

  it('[S] quitar saca un elemento sin tocar los demás', () => {
    listado.cargarMas();
    responder(['a', 'b', 'c']);

    listado.quitar('b');

    expect(ids()).toEqual(['a', 'c']);
  });

  it('[S] reiniciar vacía todo y vuelve a pedir desde 0', () => {
    listado.cargarMas();
    responder(['a', 'b'], true);

    listado.reiniciar();

    expect(ids()).toEqual([]);
    expect(listado.hayMas()).toBe(false);
    expect(listado.cargando()).toBe(true);
    expect(pedidos).toEqual([0, 0]);
  });

  it('[S] reiniciar ignora la respuesta que venía en camino', () => {
    listado.cargarMas();
    const vieja = respuestas[0];

    listado.reiniciar();
    vieja.next(pagina(['viejo']));

    expect(ids()).toEqual([]);
  });

  it('[S] cancelar descarta la respuesta pendiente', () => {
    listado.cargarMas();

    listado.cancelar();
    responder(['a']);

    expect(ids()).toEqual([]);
  });
});
