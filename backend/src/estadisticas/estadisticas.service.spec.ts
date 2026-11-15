import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EstadisticasRepositorio } from './estadisticas.repositorio.js';
import {
  EstadisticasService,
  PUBLICACIONES_EN_EL_RANKING,
} from './estadisticas.service.js';

const sinTotales = { publicaciones: 0, comentarios: 0, personasActivas: 0 };

describe('EstadisticasService', () => {
  const repositorio = {
    publicacionesPorUsuario: vi.fn(),
    publicacionesPorTipo: vi.fn(),
    comentariosPorPublicacion: vi.fn(),
    comentariosPorDia: vi.fn(),
    totales: vi.fn(),
  };
  let servicio: EstadisticasService;

  const metodos = [
    ['publicacionesPorUsuario'],
    ['publicacionesPorTipo'],
    ['comentariosPorPublicacion'],
    ['comentariosPorDia'],
  ] as const;

  beforeEach(() => {
    vi.resetAllMocks();
    repositorio.publicacionesPorUsuario.mockResolvedValue([]);
    repositorio.publicacionesPorTipo.mockResolvedValue([]);
    repositorio.comentariosPorPublicacion.mockResolvedValue([]);
    repositorio.comentariosPorDia.mockResolvedValue([]);
    repositorio.totales.mockResolvedValue(sinTotales);
    servicio = new EstadisticasService(
      repositorio as unknown as EstadisticasRepositorio,
    );
  });

  describe.each(metodos)('%s', (metodo) => {
    it('[I] le pide al repositorio el rango en hora de Buenos Aires, con el último día incluido', async () => {
      await servicio[metodo]('2026-03-01', '2026-03-31');

      const [inicio, fin] = repositorio[metodo].mock.calls[0] as Date[];
      expect(inicio.toISOString()).toBe('2026-03-01T03:00:00.000Z');
      expect(fin.toISOString()).toBe('2026-04-01T03:00:00.000Z');
    });

    it.each([
      ['desde posterior a hasta', '2026-03-31', '2026-03-01', 'RANGO_INVALIDO'],
      ['más de 366 días', '2025-02-28', '2026-03-01', 'RANGO_DEMASIADO_LARGO'],
    ])(
      '[E] con %s lanza 400 y no consulta',
      async (_caso, desde, hasta, codigo) => {
        const intento = servicio[metodo](desde, hasta);

        await expect(intento).rejects.toBeInstanceOf(BadRequestException);
        await expect(intento).rejects.toMatchObject({
          response: { codigo },
        });
        expect(repositorio[metodo]).not.toHaveBeenCalled();
      },
    );
  });

  describe('publicacionesPorUsuario', () => {
    it('[O] devuelve el id del usuario como texto', async () => {
      const id = new Types.ObjectId();
      repositorio.publicacionesPorUsuario.mockResolvedValue([
        { usuario: id, nombreUsuario: 'laura_c', cantidad: 2 },
      ]);

      const filas = await servicio.publicacionesPorUsuario(
        '2026-03-01',
        '2026-03-31',
      );

      expect(filas).toEqual([
        { usuario: String(id), nombreUsuario: 'laura_c', cantidad: 2 },
      ]);
    });
  });

  describe('publicacionesPorTipo', () => {
    it('[O] devuelve siempre los tres tipos, en el mismo orden, con la cantidad de cada uno', async () => {
      repositorio.publicacionesPorTipo.mockResolvedValue([
        { tipo: 'experiencia', cantidad: 5 },
        { tipo: 'receta', cantidad: 2 },
      ]);

      const filas = await servicio.publicacionesPorTipo(
        '2026-03-01',
        '2026-03-31',
      );

      expect(filas).toEqual([
        { tipo: 'receta', cantidad: 2 },
        { tipo: 'tip', cantidad: 0 },
        { tipo: 'experiencia', cantidad: 5 },
      ]);
    });

    it('[Z] sin publicaciones devuelve los tres tipos en cero', async () => {
      const filas = await servicio.publicacionesPorTipo(
        '2026-03-01',
        '2026-03-31',
      );

      expect(filas.map((fila) => fila.cantidad)).toEqual([0, 0, 0]);
    });

    it('[S] ignora un tipo que no existe', async () => {
      repositorio.publicacionesPorTipo.mockResolvedValue([
        { tipo: 'otro', cantidad: 9 },
      ]);

      const filas = await servicio.publicacionesPorTipo(
        '2026-03-01',
        '2026-03-31',
      );

      expect(filas).toHaveLength(3);
    });
  });

  describe('comentariosPorPublicacion', () => {
    it('[I] pide como máximo 10 publicaciones', async () => {
      await servicio.comentariosPorPublicacion('2026-03-01', '2026-03-31');

      expect(repositorio.comentariosPorPublicacion.mock.calls[0][2]).toBe(
        PUBLICACIONES_EN_EL_RANKING,
      );
      expect(PUBLICACIONES_EN_EL_RANKING).toBe(10);
    });

    it('[O] devuelve el id de la publicación como texto', async () => {
      const id = new Types.ObjectId();
      repositorio.comentariosPorPublicacion.mockResolvedValue([
        { publicacion: id, titulo: 'Tarta', cantidad: 4 },
      ]);

      const filas = await servicio.comentariosPorPublicacion(
        '2026-03-01',
        '2026-03-31',
      );

      expect(filas).toEqual([
        { publicacion: String(id), titulo: 'Tarta', cantidad: 4 },
      ]);
    });
  });

  describe('comentariosPorDia', () => {
    it('[O] completa con cero los días sin comentarios, en orden', async () => {
      repositorio.comentariosPorDia.mockResolvedValue([
        { fecha: '2026-03-12', cantidad: 5 },
        { fecha: '2026-03-10', cantidad: 2 },
      ]);

      const dias = await servicio.comentariosPorDia('2026-03-10', '2026-03-12');

      expect(dias).toEqual([
        { fecha: '2026-03-10', cantidad: 2 },
        { fecha: '2026-03-11', cantidad: 0 },
        { fecha: '2026-03-12', cantidad: 5 },
      ]);
    });

    it('[Z] sin comentarios devuelve todos los días con cero', async () => {
      const dias = await servicio.comentariosPorDia('2026-03-10', '2026-03-11');

      expect(dias).toEqual([
        { fecha: '2026-03-10', cantidad: 0 },
        { fecha: '2026-03-11', cantidad: 0 },
      ]);
    });

    it('[B] un rango de un solo día devuelve un elemento', async () => {
      const dias = await servicio.comentariosPorDia('2026-03-10', '2026-03-10');

      expect(dias).toEqual([{ fecha: '2026-03-10', cantidad: 0 }]);
    });

    it('[B] un rango de 366 días devuelve 366 elementos', async () => {
      const dias = await servicio.comentariosPorDia('2025-03-01', '2026-03-01');

      expect(dias).toHaveLength(366);
    });

    it('[S] ignora una fila de un día fuera del rango', async () => {
      repositorio.comentariosPorDia.mockResolvedValue([
        { fecha: '2026-04-01', cantidad: 9 },
      ]);

      const dias = await servicio.comentariosPorDia('2026-03-10', '2026-03-10');

      expect(dias).toEqual([{ fecha: '2026-03-10', cantidad: 0 }]);
    });
  });

  describe('resumen', () => {
    it('[I] pide los totales del rango y los del lapso anterior de igual largo, pegado al rango', async () => {
      await servicio.resumen('2026-03-01', '2026-03-31');

      const [actual, anterior] = repositorio.totales.mock.calls as Date[][];
      expect(actual.map((fecha) => fecha.toISOString())).toEqual([
        '2026-03-01T03:00:00.000Z',
        '2026-04-01T03:00:00.000Z',
      ]);
      expect(anterior.map((fecha) => fecha.toISOString())).toEqual([
        '2026-01-29T03:00:00.000Z',
        '2026-03-01T03:00:00.000Z',
      ]);
    });

    it('[O] devuelve los totales de cada lapso con sus fechas', async () => {
      repositorio.totales
        .mockResolvedValueOnce({
          publicaciones: 8,
          comentarios: 20,
          personasActivas: 5,
        })
        .mockResolvedValueOnce({
          publicaciones: 4,
          comentarios: 10,
          personasActivas: 3,
        });

      const resumen = await servicio.resumen('2026-03-01', '2026-03-31');

      expect(resumen).toEqual({
        actual: {
          desde: '2026-03-01',
          hasta: '2026-03-31',
          publicaciones: 8,
          comentarios: 20,
          personasActivas: 5,
        },
        anterior: {
          desde: '2026-01-29',
          hasta: '2026-02-28',
          publicaciones: 4,
          comentarios: 10,
          personasActivas: 3,
        },
      });
    });

    it.each([
      ['desde posterior a hasta', '2026-03-31', '2026-03-01', 'RANGO_INVALIDO'],
      ['más de 366 días', '2025-02-28', '2026-03-01', 'RANGO_DEMASIADO_LARGO'],
    ])(
      '[E] con %s lanza 400 y no consulta',
      async (_caso, desde, hasta, codigo) => {
        const intento = servicio.resumen(desde, hasta);

        await expect(intento).rejects.toMatchObject({ response: { codigo } });
        expect(repositorio.totales).not.toHaveBeenCalled();
      },
    );

    it('[B] un rango de 366 días también tiene su lapso anterior', async () => {
      const resumen = await servicio.resumen('2025-03-01', '2026-03-01');

      expect(resumen.anterior).toMatchObject({
        desde: '2024-02-29',
        hasta: '2025-02-28',
      });
    });
  });
});
