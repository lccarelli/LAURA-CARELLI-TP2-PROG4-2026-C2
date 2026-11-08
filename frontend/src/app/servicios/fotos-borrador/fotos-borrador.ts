import { inject, Service } from '@angular/core';
import { TAMANO_MAXIMO_IMAGEN } from '../../utilidades/imagen';
import { Auth } from '../auth/auth';

export interface FotosGuardadas {
  portada: File | null;
  pasos: File[][];
}

const BASE = 'banquete';
const ALMACEN = 'fotos-borrador';
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAXIMO_PASOS = 40;
const MAXIMO_POR_PASO = 5;

const esArchivo = (valor: unknown): valor is File =>
  ['[object File]', '[object Blob]'].includes(Object.prototype.toString.call(valor));

const esFotoValida = (valor: unknown): valor is File =>
  esArchivo(valor) && TIPOS_PERMITIDOS.includes(valor.type) && valor.size <= TAMANO_MAXIMO_IMAGEN;

const abrirBase = () =>
  new Promise<IDBDatabase>((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });

const esperar = <T>(pedido: IDBRequest<T>) =>
  new Promise<T>((resolver, rechazar) => {
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });

@Service()
export class FotosBorrador {
  private auth = inject(Auth);

  async leer(): Promise<FotosGuardadas | null> {
    return this.operar(async (almacen, clave) => {
      const guardado: unknown = await esperar(almacen('readonly').get(clave));
      const crudo = typeof guardado === 'object' && guardado !== null ? guardado : {};
      const { portada, pasos } = crudo as { portada?: unknown; pasos?: unknown };
      return {
        portada: esFotoValida(portada) ? portada : null,
        pasos: (Array.isArray(pasos) ? pasos.slice(0, MAXIMO_PASOS) : []).map((fotosDelPaso) =>
          (Array.isArray(fotosDelPaso) ? fotosDelPaso : [])
            .slice(0, MAXIMO_POR_PASO)
            .filter(esFotoValida),
        ),
      };
    });
  }

  async guardar(fotos: FotosGuardadas): Promise<void> {
    const hay = fotos.portada || fotos.pasos.some((fotosDelPaso) => fotosDelPaso.length);
    if (!hay) {
      return this.borrar();
    }
    await this.operar((almacen, clave) => esperar(almacen('readwrite').put(fotos, clave)));
  }

  async borrar(): Promise<void> {
    await this.operar((almacen, clave) => esperar(almacen('readwrite').delete(clave)));
  }

  private async operar<T>(
    accion: (almacen: (modo: IDBTransactionMode) => IDBObjectStore, clave: string) => Promise<T>,
  ): Promise<T | null> {
    const id = this.auth.usuario()?._id;
    if (!id || typeof indexedDB === 'undefined') {
      return null;
    }
    try {
      const base = await abrirBase();
      try {
        return await accion(
          (modo) => base.transaction(ALMACEN, modo).objectStore(ALMACEN),
          `borrador:${id}`,
        );
      } finally {
        base.close();
      }
    } catch {
      return null;
    }
  }
}
