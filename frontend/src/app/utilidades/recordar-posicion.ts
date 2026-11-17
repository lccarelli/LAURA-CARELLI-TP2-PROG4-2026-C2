import { DestroyRef, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Historial } from '../servicios/historial/historial';
import { ListadoPaginado } from './listado-paginado';

export function recordarPosicion(listado: ListadoPaginado<{ _id: string }>): boolean {
  const historial = inject(Historial);
  const clave = inject(Router).url;
  const baja = historial.registrar(clave, () => ({
    y: window.scrollY,
    cantidad: listado.items().length,
  }));
  inject(DestroyRef).onDestroy(baja);

  let pendiente = historial.restaurar(clave);
  const restaurando = pendiente !== undefined;
  effect(() => {
    const cargando = listado.cargando();
    const cantidad = listado.items().length;
    if (!pendiente || cargando || (cantidad === 0 && !listado.fallaLaCarga())) {
      return;
    }
    untracked(() => {
      if (
        pendiente &&
        cantidad < pendiente.cantidad &&
        listado.hayMas() &&
        !listado.fallaLaCarga()
      ) {
        listado.cargarMas();
        return;
      }
      const { y } = pendiente!;
      pendiente = undefined;
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
  });
  return restaurando;
}

export const ESPERA_MAXIMA_ALTURA_MS = 2500;
const GESTOS_DE_LA_PERSONA = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

export function recordarAltura() {
  const historial = inject(Historial);
  const clave = inject(Router).url;
  const baja = historial.registrar(clave, () => ({ y: window.scrollY, cantidad: 0 }));
  let activa = true;
  const detener = () => {
    activa = false;
    GESTOS_DE_LA_PERSONA.forEach((gesto) => globalThis.removeEventListener(gesto, detener));
  };
  inject(DestroyRef).onDestroy(() => {
    detener();
    baja();
  });

  const pendiente = historial.restaurar(clave);
  if (!pendiente) {
    return;
  }
  GESTOS_DE_LA_PERSONA.forEach((gesto) =>
    globalThis.addEventListener(gesto, detener, { passive: true }),
  );
  const limite = Date.now() + ESPERA_MAXIMA_ALTURA_MS;
  const fijar = () => {
    if (!activa) {
      return;
    }
    if (Date.now() > limite) {
      detener();
      return;
    }
    const alcanza = document.documentElement.scrollHeight - window.innerHeight >= pendiente.y;
    if (alcanza && Math.abs(window.scrollY - pendiente.y) > 1) {
      window.scrollTo(0, pendiente.y);
    }
    requestAnimationFrame(fijar);
  };
  requestAnimationFrame(fijar);
}
