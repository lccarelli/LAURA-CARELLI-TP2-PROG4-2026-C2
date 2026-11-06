import { inject, Service } from '@angular/core';
import { Tipo, TIPOS, Unidad, UNIDADES } from '../../interfaces/publicacion';
import { Auth } from '../auth/auth';

export interface IngredienteBorrador {
  cantidad: number | null;
  unidad: Unidad;
  nombre: string;
}

export interface BorradorPublicacion {
  tipo: Tipo;
  titulo: string;
  mensaje: string;
  porciones: string;
  tiempoMinutos: string;
  calorias: string;
  costo: number | null;
  ingredientes: IngredienteBorrador[];
  pasos: string[];
  guardadoEn: string;
}

export type DatosBorrador = Omit<BorradorPublicacion, 'guardadoEn'>;

const MAXIMO_FILAS = 40;

const texto = (valor: unknown, maximo: number) =>
  typeof valor === 'string' ? valor.slice(0, maximo) : '';

const digitos = (valor: unknown) =>
  typeof valor === 'string' ? valor.replace(/\D/g, '').slice(0, 6) : '';

const objeto = (valor: unknown): Record<string, unknown> =>
  typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : {};

const lista = (valor: unknown): unknown[] =>
  Array.isArray(valor) ? valor.slice(0, MAXIMO_FILAS) : [];

export function borradorVacio(datos: DatosBorrador): boolean {
  return (
    !datos.titulo.trim() &&
    !datos.mensaje.trim() &&
    !datos.porciones &&
    !datos.tiempoMinutos &&
    !datos.calorias &&
    datos.costo === null &&
    datos.ingredientes.every((fila) => !fila.nombre.trim() && fila.cantidad === null) &&
    datos.pasos.every((paso) => !paso.trim())
  );
}

function normalizar(valor: unknown): BorradorPublicacion | null {
  const crudo = objeto(valor);
  const costo = crudo['costo'];
  const guardadoEn = crudo['guardadoEn'];
  const datos: DatosBorrador = {
    tipo: TIPOS.find((tipo) => tipo === crudo['tipo']) ?? 'receta',
    titulo: texto(crudo['titulo'], 55),
    mensaje: texto(crudo['mensaje'], 2000),
    porciones: digitos(crudo['porciones']),
    tiempoMinutos: digitos(crudo['tiempoMinutos']),
    calorias: digitos(crudo['calorias']),
    costo:
      typeof costo === 'number' && Number.isInteger(costo) && costo >= 1 && costo <= 4
        ? costo
        : null,
    ingredientes: lista(crudo['ingredientes']).map((fila) => {
      const { cantidad, unidad, nombre } = objeto(fila);
      return {
        cantidad: typeof cantidad === 'number' && Number.isFinite(cantidad) ? cantidad : null,
        unidad: UNIDADES.find((valida) => valida === unidad) ?? 'g',
        nombre: texto(nombre, 100),
      };
    }),
    pasos: lista(crudo['pasos']).map((paso) => texto(paso, 500)),
  };

  if (borradorVacio(datos)) {
    return null;
  }
  return {
    ...datos,
    guardadoEn:
      typeof guardadoEn === 'string' && !Number.isNaN(Date.parse(guardadoEn))
        ? guardadoEn
        : new Date().toISOString(),
  };
}

@Service()
export class Borrador {
  private auth = inject(Auth);

  leer(): BorradorPublicacion | null {
    const clave = this.clave();
    if (!clave) {
      return null;
    }
    try {
      const guardado = localStorage.getItem(clave);
      return guardado ? normalizar(JSON.parse(guardado)) : null;
    } catch {
      return null;
    }
  }

  guardar(datos: DatosBorrador): string | null {
    const clave = this.clave();
    if (!clave) {
      return null;
    }
    if (borradorVacio(datos)) {
      this.borrar();
      return null;
    }
    const guardadoEn = new Date().toISOString();
    try {
      localStorage.setItem(clave, JSON.stringify({ ...datos, guardadoEn }));
      return guardadoEn;
    } catch {
      return null;
    }
  }

  borrar() {
    const clave = this.clave();
    if (!clave) {
      return;
    }
    try {
      localStorage.removeItem(clave);
    } catch {
      return;
    }
  }

  private clave() {
    const id = this.auth.usuario()?._id;
    return id ? `borrador:${id}` : null;
  }
}
