import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearComentarioDto } from './crear-comentario.dto.js';

async function camposInvalidos(body: Record<string, unknown>) {
  const errores = await validate(plainToInstance(CrearComentarioDto, body));
  return errores.map((error) => error.property);
}

describe('CrearComentarioDto', () => {
  it('[Z] sin ningún dato falla en mensaje', async () => {
    expect(await camposInvalidos({})).toEqual(['mensaje']);
  });

  it('[O] un mensaje de texto es válido y se le sacan los espacios de los costados', async () => {
    expect(await camposInvalidos({ mensaje: 'Me encantó' })).toEqual([]);
    expect(
      plainToInstance(CrearComentarioDto, { mensaje: '  Me encantó  ' })
        .mensaje,
    ).toBe('Me encantó');
  });

  it('[B] hasta 500 caracteres pasa y 501 falla', async () => {
    expect(await camposInvalidos({ mensaje: 'a'.repeat(500) })).toEqual([]);
    expect(await camposInvalidos({ mensaje: 'a'.repeat(501) })).toEqual([
      'mensaje',
    ]);
  });

  it('[B] un solo carácter pasa; vacío o sólo espacios falla', async () => {
    expect(await camposInvalidos({ mensaje: 'a' })).toEqual([]);
    expect(await camposInvalidos({ mensaje: '' })).toEqual(['mensaje']);
    expect(await camposInvalidos({ mensaje: '   ' })).toEqual(['mensaje']);
  });

  it('[E] lo que no es texto falla', async () => {
    for (const mensaje of [5, true, null, ['hola'], { $ne: null }]) {
      expect(await camposInvalidos({ mensaje })).toEqual(['mensaje']);
    }
  });
});
