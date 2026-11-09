import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EditarComentarioDto } from './editar-comentario.dto.js';
import { ComentarioParamDto } from './comentario-param.dto.js';

async function camposInvalidos<T extends object>(
  clase: new () => T,
  datos: Record<string, unknown>,
) {
  const errores = await validate(plainToInstance(clase, datos));
  return errores.map((error) => error.property).sort();
}

describe('EditarComentarioDto', () => {
  it('[O] tiene las mismas reglas que crear: de 1 a 500 caracteres, sin espacios de más', async () => {
    expect(
      await camposInvalidos(EditarComentarioDto, { mensaje: 'a' }),
    ).toEqual([]);
    expect(
      await camposInvalidos(EditarComentarioDto, { mensaje: 'a'.repeat(500) }),
    ).toEqual([]);
    expect(
      plainToInstance(EditarComentarioDto, { mensaje: '  hola ' }).mensaje,
    ).toBe('hola');
  });

  it('[E] vacío, 501 caracteres o sin mensaje fallan', async () => {
    for (const datos of [{ mensaje: '' }, { mensaje: 'a'.repeat(501) }, {}]) {
      expect(await camposInvalidos(EditarComentarioDto, datos)).toEqual([
        'mensaje',
      ]);
    }
  });
});

describe('ComentarioParamDto', () => {
  const valido = '64b64b64b64b64b64b64b64b';

  it('[O] acepta dos ids con formato de ObjectId', async () => {
    expect(
      await camposInvalidos(ComentarioParamDto, {
        id: valido,
        comentarioId: valido,
      }),
    ).toEqual([]);
  });

  it('[E] rechaza cada uno por separado si no es un id', async () => {
    expect(
      await camposInvalidos(ComentarioParamDto, {
        id: 'abc',
        comentarioId: valido,
      }),
    ).toEqual(['id']);
    expect(
      await camposInvalidos(ComentarioParamDto, {
        id: valido,
        comentarioId: '123',
      }),
    ).toEqual(['comentarioId']);
    expect(await camposInvalidos(ComentarioParamDto, {})).toEqual([
      'comentarioId',
      'id',
    ]);
  });
});
