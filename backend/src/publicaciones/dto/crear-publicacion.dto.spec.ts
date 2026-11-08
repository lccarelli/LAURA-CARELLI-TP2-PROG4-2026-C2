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

  describe('tipoRinde', () => {
    it('[O] es opcional y acepta porciones o unidades', async () => {
      expect(await camposInvalidos({})).toEqual([]);
      for (const tipoRinde of ['porciones', 'unidades']) {
        expect(await camposInvalidos({ tipoRinde })).toEqual([]);
      }
    });

    it('[E] cualquier otro valor falla', async () => {
      for (const tipoRinde of ['tazas', '', 5, { $ne: null }]) {
        expect(await camposInvalidos({ tipoRinde })).toEqual(['tipoRinde']);
      }
    });
  });

  describe('tipo', () => {
    it('[O] los tres tipos pasan', async () => {
      for (const tipo of ['receta', 'tip', 'experiencia']) {
        expect(await camposInvalidos({ tipo })).toEqual([]);
      }
    });

    it('[E] un tipo desconocido o vacío falla', async () => {
      expect(await camposInvalidos({ tipo: 'chisme' })).toEqual(['tipo']);
      expect(await camposInvalidos({ tipo: 'completa' })).toEqual(['tipo']);
      expect(await camposInvalidos({ tipo: '' })).toEqual(['tipo']);
    });
  });

  describe('pasos', () => {
    it('[O] es opcional y acepta una lista de textos, también como JSON', async () => {
      expect(await camposInvalidos({ pasos: ['Mezclar', 'Hornear'] })).toEqual(
        [],
      );
      expect(
        await camposInvalidos({ pasos: JSON.stringify(['Mezclar']) }),
      ).toEqual([]);
      expect(await camposInvalidos({ pasos: [] })).toEqual([]);
    });

    it('[E] un texto que no es lista, o con pasos vacíos o que no son texto, falla', async () => {
      expect(await camposInvalidos({ pasos: 'Mezclar\nHornear' })).toEqual([
        'pasos',
      ]);
      expect(await camposInvalidos({ pasos: ['Mezclar', ''] })).toEqual([
        'pasos',
      ]);
      expect(await camposInvalidos({ pasos: ['   '] })).toEqual(['pasos']);
      expect(await camposInvalidos({ pasos: [1] })).toEqual(['pasos']);
    });

    it('[O] un paso puede ser un objeto con título, texto y números de foto', async () => {
      expect(
        await camposInvalidos({
          pasos: [
            { titulo: 'La masa', texto: 'Mezclar', fotos: [0, 1] },
            { texto: 'Hornear' },
          ],
        }),
      ).toEqual([]);
      expect(
        await camposInvalidos({
          pasos: JSON.stringify([{ texto: ' Mezclar ', fotos: [19] }]),
        }),
      ).toEqual([]);
    });

    it('[E] un paso sin texto, con título muy largo o con fotos inválidas falla', async () => {
      for (const paso of [
        { fotos: [0] },
        { texto: '' },
        { texto: 'a', titulo: 'a'.repeat(81) },
        { texto: 'a', titulo: 5 },
        { texto: 'a', fotos: [-1] },
        { texto: 'a', fotos: [20] },
        { texto: 'a', fotos: [1.5] },
        { texto: 'a', fotos: ['1'] },
        { texto: 'a', fotos: [0, 0] },
        { texto: 'a', fotos: [0, 1, 2, 3, 4, 5] },
        { texto: 'a', fotos: 1 },
      ]) {
        expect(await camposInvalidos({ pasos: [paso] })).toEqual(['pasos']);
      }
    });

    it('[B] cada paso tiene hasta 2000 caracteres y hay hasta 40 pasos', async () => {
      expect(await camposInvalidos({ pasos: ['a'.repeat(2000)] })).toEqual([]);
      expect(await camposInvalidos({ pasos: ['a'.repeat(2001)] })).toEqual([
        'pasos',
      ]);
      expect(await camposInvalidos({ pasos: Array(40).fill('a') })).toEqual([]);
      expect(await camposInvalidos({ pasos: Array(41).fill('a') })).toEqual([
        'pasos',
      ]);
    });
  });

  describe('ficha: porciones, tiempoMinutos, costo y calorias', () => {
    const limites = [
      ['porciones', 1, 100],
      ['tiempoMinutos', 1, 10080],
      ['costo', 1, 4],
      ['calorias', 1, 10000],
    ] as const;

    it('[Z] son opcionales', async () => {
      expect(await camposInvalidos({})).toEqual([]);
    });

    it.each(limites)(
      '[B] %s acepta de %i a %i y rechaza afuera',
      async (campo, minimo, maximo) => {
        expect(await camposInvalidos({ [campo]: minimo })).toEqual([]);
        expect(await camposInvalidos({ [campo]: maximo })).toEqual([]);
        expect(await camposInvalidos({ [campo]: minimo - 1 })).toEqual([campo]);
        expect(await camposInvalidos({ [campo]: maximo + 1 })).toEqual([campo]);
      },
    );

    it.each(limites)(
      '[O] %s llega como texto desde un formulario con archivo',
      async (campo, minimo) => {
        expect(await camposInvalidos({ [campo]: String(minimo) })).toEqual([]);
      },
    );

    it('[Z] un null cuenta como campo no enviado', async () => {
      expect(await camposInvalidos({ porciones: null, costo: null })).toEqual(
        [],
      );
    });

    it.each(limites)(
      '[E] %s rechaza todo lo que no sea un entero escrito con dígitos',
      async (campo) => {
        const intentos = [
          '',
          ' 2',
          '2 ',
          '2.5',
          '-2',
          '1e2',
          '0x10',
          'dos',
          '2; DROP TABLE publicaciones',
          "2' OR '1'='1",
          '<script>1</script>',
          '1234567',
          2.5,
          true,
          [2],
          { $gt: 0 },
          { $ne: null },
          '{"$gt":0}',
        ];

        for (const intento of intentos) {
          expect(
            await camposInvalidos({ [campo]: intento }),
            JSON.stringify(intento),
          ).toEqual([campo]);
        }
      },
    );
  });

  describe('ingredientes', () => {
    const harina = { nombre: 'Harina', cantidad: 250, unidad: 'g' };

    it('[O] es opcional y acepta una lista de ingredientes', async () => {
      expect(await camposInvalidos({})).toEqual([]);
      expect(await camposInvalidos({ ingredientes: [harina] })).toEqual([]);
      expect(await camposInvalidos({ ingredientes: [] })).toEqual([]);
    });

    it('[O] llega como texto JSON desde un formulario con archivo', async () => {
      expect(
        await camposInvalidos({ ingredientes: JSON.stringify([harina]) }),
      ).toEqual([]);
    });

    it('[E] un texto que no es JSON o que no es una lista falla', async () => {
      expect(await camposInvalidos({ ingredientes: 'Pan\nManteca' })).toEqual([
        'ingredientes',
      ]);
      expect(
        await camposInvalidos({ ingredientes: '{"nombre":"Pan"}' }),
      ).toEqual(['ingredientes']);
    });

    it('[B] hasta 40 ingredientes pasan y 41 fallan', async () => {
      expect(
        await camposInvalidos({ ingredientes: Array(40).fill(harina) }),
      ).toEqual([]);
      expect(
        await camposInvalidos({ ingredientes: Array(41).fill(harina) }),
      ).toEqual(['ingredientes']);
    });

    it('[B] el nombre va de 1 a 100 caracteres y no puede ser sólo espacios', async () => {
      const con = (nombre: string) => ({
        ingredientes: [{ ...harina, nombre }],
      });

      expect(await camposInvalidos(con('a'))).toEqual([]);
      expect(await camposInvalidos(con('a'.repeat(100)))).toEqual([]);
      expect(await camposInvalidos(con(''))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con('   '))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con('a'.repeat(101)))).toEqual([
        'ingredientes',
      ]);
    });

    it('[B] la cantidad es mayor que 0, con hasta 2 decimales y hasta 100000', async () => {
      const con = (cantidad: unknown) => ({
        ingredientes: [{ ...harina, cantidad }],
      });

      expect(await camposInvalidos(con(0.25))).toEqual([]);
      expect(await camposInvalidos(con(100000))).toEqual([]);
      expect(await camposInvalidos(con(0))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con(-1))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con(0.255))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con(100001))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con('dos'))).toEqual(['ingredientes']);
      expect(await camposInvalidos(con(undefined))).toEqual(['ingredientes']);
    });

    it('[I] "a gusto" no necesita cantidad', async () => {
      const sal = { nombre: 'Sal', unidad: 'a_gusto' };

      expect(await camposInvalidos({ ingredientes: [sal] })).toEqual([]);
    });

    it('[E] una medida desconocida o ausente falla', async () => {
      expect(
        await camposInvalidos({
          ingredientes: [{ ...harina, unidad: 'libra' }],
        }),
      ).toEqual(['ingredientes']);
      expect(
        await camposInvalidos({
          ingredientes: [{ nombre: 'Harina', cantidad: 1 }],
        }),
      ).toEqual(['ingredientes']);
    });
  });

  it('[E] un número en lugar de texto falla', async () => {
    expect(await camposInvalidos({ titulo: 123 })).toEqual(['titulo']);
  });
});
