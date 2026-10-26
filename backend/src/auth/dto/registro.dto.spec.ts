import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegistroDto } from './registro.dto.js';

const valido = {
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  clave: 'Clave1234',
  fechaNacimiento: '1990-05-20',
  descripcion: 'Estudiante de programación',
};

async function camposInvalidos(cambios: Record<string, unknown>) {
  const dto = plainToInstance(RegistroDto, { ...valido, ...cambios });
  const errores = await validate(dto);
  return errores.map((error) => error.property);
}

describe('RegistroDto', () => {
  it('[Z] sin ningún dato falla en los siete campos', async () => {
    const errores = await validate(plainToInstance(RegistroDto, {}));
    expect(errores.map((error) => error.property).sort()).toEqual([
      'apellido',
      'clave',
      'correo',
      'descripcion',
      'fechaNacimiento',
      'nombre',
      'nombreUsuario',
    ]);
  });

  it('[O] con todos los datos válidos no falla', async () => {
    expect(await camposInvalidos({})).toEqual([]);
  });

  describe('clave', () => {
    it('[B] 7 caracteres falla y 8 pasa', async () => {
      expect(await camposInvalidos({ clave: 'Clave12' })).toEqual(['clave']);
      expect(await camposInvalidos({ clave: 'Clave123' })).toEqual([]);
    });

    it('[B] 12 caracteres pasa y 13 falla', async () => {
      const base = 'Clave1';
      expect(await camposInvalidos({ clave: base + 'a'.repeat(6) })).toEqual(
        [],
      );
      expect(await camposInvalidos({ clave: base + 'a'.repeat(7) })).toEqual([
        'clave',
      ]);
    });

    it('[B] sin mayúscula falla', async () => {
      expect(await camposInvalidos({ clave: 'clave1234' })).toEqual(['clave']);
    });

    it('[B] sin número falla', async () => {
      expect(await camposInvalidos({ clave: 'ClaveClave' })).toEqual(['clave']);
    });
  });

  describe('nombreUsuario', () => {
    it('[B] 2 caracteres falla, 3 y 20 pasan, 21 falla', async () => {
      expect(await camposInvalidos({ nombreUsuario: 'ab' })).toEqual([
        'nombreUsuario',
      ]);
      expect(await camposInvalidos({ nombreUsuario: 'abc' })).toEqual([]);
      expect(await camposInvalidos({ nombreUsuario: 'a'.repeat(20) })).toEqual(
        [],
      );
      expect(await camposInvalidos({ nombreUsuario: 'a'.repeat(21) })).toEqual([
        'nombreUsuario',
      ]);
    });

    it('[I] no admite arroba, para no confundirlo con un correo', async () => {
      expect(await camposInvalidos({ nombreUsuario: 'laura@c' })).toEqual([
        'nombreUsuario',
      ]);
    });
  });

  describe('nombre y apellido', () => {
    it('[B] 1 caracter falla, 2 y 30 pasan, 31 falla', async () => {
      expect(await camposInvalidos({ nombre: 'L' })).toEqual(['nombre']);
      expect(await camposInvalidos({ nombre: 'Lu' })).toEqual([]);
      expect(await camposInvalidos({ nombre: 'L'.repeat(30) })).toEqual([]);
      expect(await camposInvalidos({ nombre: 'L'.repeat(31) })).toEqual([
        'nombre',
      ]);
    });
  });

  describe('correo', () => {
    it('[I] sin formato de correo falla', async () => {
      expect(await camposInvalidos({ correo: 'laura' })).toEqual(['correo']);
    });

    it('[B] 30 caracteres pasa y 31 falla', async () => {
      const correo = (largo: number) =>
        'a'.repeat(largo - '@correo.com'.length) + '@correo.com';

      expect(await camposInvalidos({ correo: correo(30) })).toEqual([]);
      expect(await camposInvalidos({ correo: correo(31) })).toEqual(['correo']);
    });
  });

  describe('descripcion', () => {
    it('[B] vacía falla, 200 pasa y 201 falla', async () => {
      expect(await camposInvalidos({ descripcion: '' })).toEqual([
        'descripcion',
      ]);
      expect(await camposInvalidos({ descripcion: 'a'.repeat(200) })).toEqual(
        [],
      );
      expect(await camposInvalidos({ descripcion: 'a'.repeat(201) })).toEqual([
        'descripcion',
      ]);
    });
  });

  describe('fechaNacimiento', () => {
    it('[I] acepta una fecha ISO', async () => {
      expect(await camposInvalidos({ fechaNacimiento: '2000-02-29' })).toEqual(
        [],
      );
    });

    it('[E] rechaza texto que no es fecha y fechas que no existen', async () => {
      expect(await camposInvalidos({ fechaNacimiento: 'ayer' })).toEqual([
        'fechaNacimiento',
      ]);
      expect(await camposInvalidos({ fechaNacimiento: '2001-02-29' })).toEqual([
        'fechaNacimiento',
      ]);
    });
  });

  describe('espacios alrededor', () => {
    it('[B] un nombre de sólo espacios falla', async () => {
      expect(await camposInvalidos({ nombre: '   ' })).toEqual(['nombre']);
    });

    it('[B] una descripción de sólo espacios falla', async () => {
      expect(await camposInvalidos({ descripcion: '   ' })).toEqual([
        'descripcion',
      ]);
    });

    it('[B] los espacios del correo se descartan antes de validar', async () => {
      expect(await camposInvalidos({ correo: ' laura@correo.com ' })).toEqual(
        [],
      );
    });
  });
});
