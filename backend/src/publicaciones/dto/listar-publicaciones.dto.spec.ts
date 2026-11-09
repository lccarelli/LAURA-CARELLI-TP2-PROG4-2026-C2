import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListarPublicacionesDto } from './listar-publicaciones.dto.js';

async function camposInvalidos(consulta: Record<string, unknown>) {
  const dto = plainToInstance(ListarPublicacionesDto, consulta);
  const errores = await validate(dto);
  return errores.map((error) => error.property);
}

describe('ListarPublicacionesDto', () => {
  it('[Z] sin nada usa orden por fecha, offset 0 y limit 10', () => {
    const dto = plainToInstance(ListarPublicacionesDto, {});

    expect(dto).toMatchObject({ orden: 'fecha', offset: 0, limit: 10 });
    expect(dto.usuario).toBeUndefined();
  });

  it('[O] acepta los dos órdenes y un usuario con formato de id', async () => {
    expect(await camposInvalidos({ orden: 'fecha' })).toEqual([]);
    expect(await camposInvalidos({ orden: 'megusta' })).toEqual([]);
    expect(
      await camposInvalidos({ usuario: '64b64b64b64b64b64b64b64b' }),
    ).toEqual([]);
  });

  it('[E] rechaza órdenes desconocidos', async () => {
    for (const orden of ['autor', '', 'Fecha', 5, { $ne: null }]) {
      expect(await camposInvalidos({ orden })).toEqual(['orden']);
    }
  });

  it('[E] rechaza usuarios que no son un id', async () => {
    for (const usuario of [
      'abc',
      '',
      '123',
      { $ne: '1' },
      ['64b64b64b64b64b64b64b64b'],
    ]) {
      expect(await camposInvalidos({ usuario })).toEqual(['usuario']);
    }
  });

  it('[M] conserva la validación de offset y limit', async () => {
    expect(await camposInvalidos({ limit: 51 })).toEqual(['limit']);
    expect(await camposInvalidos({ offset: -1 })).toEqual(['offset']);
  });
});
