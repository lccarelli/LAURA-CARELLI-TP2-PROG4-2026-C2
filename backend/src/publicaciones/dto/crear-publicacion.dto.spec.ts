import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearPublicacionDto } from './crear-publicacion.dto.js';

async function camposInvalidos(cambios: Record<string, unknown>) {
  const dto = plainToInstance(CrearPublicacionDto, {
    tipo: 'experiencia',
    titulo: 'Mi primera publicación',
    mensaje: 'Hola a todos',
    ...cambios,
  });
  const errores = await validate(dto);
  return errores.map((error) => error.property);
}

describe('CrearPublicacionDto', () => {
  it('[Z] sin ningún dato falla en tipo, titulo y mensaje', async () => {
    const errores = await validate(plainToInstance(CrearPublicacionDto, {}));

    expect(errores.map((error) => error.property).sort()).toEqual([
      'mensaje',
      'tipo',
      'titulo',
    ]);
  });

  it('[O] con título y mensaje válidos no falla', async () => {
    expect(await camposInvalidos({})).toEqual([]);
  });

  describe('titulo', () => {
    it('[B] vacío falla, 1 y 55 pasan, 56 falla', async () => {
      expect(await camposInvalidos({ titulo: '' })).toEqual(['titulo']);
      expect(await camposInvalidos({ titulo: 'a' })).toEqual([]);
      expect(await camposInvalidos({ titulo: 'a'.repeat(55) })).toEqual([]);
      expect(await camposInvalidos({ titulo: 'a'.repeat(56) })).toEqual([
        'titulo',
      ]);
    });

    it('[B] de sólo espacios falla', async () => {
      expect(await camposInvalidos({ titulo: '   ' })).toEqual(['titulo']);
    });
  });

  describe('mensaje', () => {
    it('[B] vacío falla, 2000 pasa y 2001 falla', async () => {
      expect(await camposInvalidos({ mensaje: '' })).toEqual(['mensaje']);
      expect(await camposInvalidos({ mensaje: 'a'.repeat(2000) })).toEqual([]);
      expect(await camposInvalidos({ mensaje: 'a'.repeat(2001) })).toEqual([
        'mensaje',
      ]);
    });
  });

  describe('tipo', () => {
    it('[O] los cuatro tipos pasan', async () => {
      for (const tipo of ['receta', 'tip', 'experiencia', 'completa']) {
        expect(await camposInvalidos({ tipo })).toEqual([]);
      }
    });

    it('[E] un tipo desconocido o vacío falla', async () => {
      expect(await camposInvalidos({ tipo: 'chisme' })).toEqual(['tipo']);
      expect(await camposInvalidos({ tipo: '' })).toEqual(['tipo']);
    });
  });

  describe('ingredientes y pasos', () => {
    it('[B] son opcionales y tienen tope de 1000 y 2000 caracteres', async () => {
      expect(await camposInvalidos({ ingredientes: 'a'.repeat(1000) })).toEqual(
        [],
      );
      expect(await camposInvalidos({ ingredientes: 'a'.repeat(1001) })).toEqual(
        ['ingredientes'],
      );
      expect(await camposInvalidos({ pasos: 'a'.repeat(2000) })).toEqual([]);
      expect(await camposInvalidos({ pasos: 'a'.repeat(2001) })).toEqual([
        'pasos',
      ]);
    });
  });

  it('[E] un número en lugar de texto falla', async () => {
    expect(await camposInvalidos({ titulo: 123 })).toEqual(['titulo']);
  });
});
