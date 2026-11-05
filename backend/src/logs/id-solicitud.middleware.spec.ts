import type { Request, Response } from 'express';
import {
  asignarIdSolicitud,
  obtenerIdSolicitud,
} from './id-solicitud.middleware.js';

function ejecutar(encabezado?: string) {
  const solicitud = { header: () => encabezado } as unknown as Request;
  const encabezados: Record<string, string> = {};
  const respuesta = {
    setHeader: (nombre: string, valor: string) => {
      encabezados[nombre] = valor;
    },
  } as unknown as Response;
  let idEnLaSolicitud: string | undefined;
  asignarIdSolicitud(solicitud, respuesta, () => {
    idEnLaSolicitud = obtenerIdSolicitud();
  });
  return { encabezados, idEnLaSolicitud };
}

describe('asignarIdSolicitud', () => {
  it('[Z] sin encabezado genera un id nuevo', () => {
    const { idEnLaSolicitud } = ejecutar();

    expect(idEnLaSolicitud).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('[O] devuelve el id en el encabezado de la respuesta', () => {
    const { encabezados, idEnLaSolicitud } = ejecutar();

    expect(encabezados['x-request-id']).toBe(idEnLaSolicitud);
  });

  it('[M] conserva el id que manda el cliente', () => {
    const { idEnLaSolicitud } = ejecutar('cliente-12345678');

    expect(idEnLaSolicitud).toBe('cliente-12345678');
  });

  it('[B] un id demasiado corto se reemplaza', () => {
    const { idEnLaSolicitud } = ejecutar('corto');

    expect(idEnLaSolicitud).not.toBe('corto');
  });

  it('[I] un id con caracteres raros se reemplaza', () => {
    const { idEnLaSolicitud } = ejecutar('x"},{"nivel":"error');

    expect(idEnLaSolicitud).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('[E] fuera de la solicitud no queda ningún id', () => {
    ejecutar();

    expect(obtenerIdSolicitud()).toBeUndefined();
  });
});
