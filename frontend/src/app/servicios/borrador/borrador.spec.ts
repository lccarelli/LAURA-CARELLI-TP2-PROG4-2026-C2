import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../auth/auth';
import { Borrador, borradorVacio, DatosBorrador } from './borrador';

const usuario = (id: string): Usuario => ({
  _id: id,
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: '',
  perfil: 'usuario',
  habilitado: true,
});

const vacio: DatosBorrador = {
  tipo: 'receta',
  titulo: '',
  mensaje: '',
  porciones: '',
  tiempoMinutos: '',
  calorias: '',
  costo: null,
  ingredientes: [{ cantidad: null, unidad: 'g', nombre: '' }],
  pasos: [''],
};

const conDatos: DatosBorrador = {
  tipo: 'completa',
  titulo: 'Crema de albahaca',
  mensaje: 'Versátil',
  porciones: '4',
  tiempoMinutos: '19',
  calorias: '270',
  costo: 2,
  ingredientes: [
    { cantidad: 1, unidad: 'taza', nombre: 'albahaca' },
    { cantidad: null, unidad: 'a_gusto', nombre: 'sal' },
  ],
  pasos: ['Cortar', 'Mezclar'],
};

describe('Borrador', () => {
  let auth: Auth;
  let borrador: Borrador;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
    auth.usuario.set(usuario('u1'));
    borrador = TestBed.inject(Borrador);
  });

  afterEach(() => vi.restoreAllMocks());

  it('[Z] sin nada guardado no hay borrador', () => {
    expect(borrador.leer()).toBeNull();
  });

  it('[Z] un borrador sin ningún dato no se guarda', () => {
    expect(borrador.guardar(vacio)).toBeNull();
    expect(localStorage.getItem('borrador:u1')).toBeNull();
  });

  it('[Z] vaciar lo escrito borra el borrador anterior', () => {
    borrador.guardar(conDatos);

    expect(borrador.guardar(vacio)).toBeNull();
    expect(borrador.leer()).toBeNull();
  });

  it('[O] guarda y devuelve lo escrito, con la fecha en que se guardó', () => {
    const fecha = borrador.guardar(conDatos);

    const guardado = borrador.leer()!;
    expect(fecha).toBe(guardado.guardadoEn);
    expect(guardado).toEqual({ ...conDatos, guardadoEn: fecha });
  });

  it('[S] cada persona tiene su borrador', () => {
    borrador.guardar(conDatos);

    auth.usuario.set(usuario('u2'));
    expect(borrador.leer()).toBeNull();

    auth.usuario.set(usuario('u1'));
    expect(borrador.leer()?.titulo).toBe('Crema de albahaca');
  });

  it('[I] borrar quita el borrador', () => {
    borrador.guardar(conDatos);

    borrador.borrar();

    expect(borrador.leer()).toBeNull();
  });

  it('[Z] sin sesión no guarda, no lee y no borra el de nadie', () => {
    borrador.guardar(conDatos);
    auth.usuario.set(null);

    expect(borrador.guardar(conDatos)).toBeNull();
    expect(borrador.leer()).toBeNull();
    borrador.borrar();
    expect(localStorage.getItem('borrador:u1')).not.toBeNull();
  });

  describe('lo guardado se vuelve a validar al leerlo', () => {
    const leerAlterado = (cambios: Record<string, unknown>) => {
      localStorage.setItem('borrador:u1', JSON.stringify({ ...conDatos, ...cambios }));
      return borrador.leer()!;
    };

    it('[E] un JSON roto o que no es un objeto se ignora', () => {
      for (const valor of ['{roto', 'null', '"texto"', '42', '[]']) {
        localStorage.setItem('borrador:u1', valor);
        expect(borrador.leer(), valor).toBeNull();
      }
    });

    it('[E] un tipo, una medida o un costo inválidos vuelven a un valor seguro', () => {
      const leido = leerAlterado({
        tipo: 'chisme',
        costo: 9,
        ingredientes: [{ cantidad: 1, unidad: 'libra', nombre: 'x' }],
      });

      expect(leido.tipo).toBe('receta');
      expect(leido.costo).toBeNull();
      expect(leido.ingredientes[0].unidad).toBe('g');
    });

    it('[E] los textos se recortan a los máximos del formulario', () => {
      const leido = leerAlterado({
        titulo: 'a'.repeat(100),
        mensaje: 'a'.repeat(3000),
        ingredientes: [{ cantidad: 1, unidad: 'g', nombre: 'a'.repeat(300) }],
        pasos: ['a'.repeat(900)],
      });

      expect(leido.titulo).toHaveLength(55);
      expect(leido.mensaje).toHaveLength(2000);
      expect(leido.ingredientes[0].nombre).toHaveLength(100);
      expect(leido.pasos[0]).toHaveLength(500);
    });

    it('[E] las listas se recortan a 40 filas', () => {
      const leido = leerAlterado({
        ingredientes: Array(60).fill({ cantidad: 1, unidad: 'g', nombre: 'x' }),
        pasos: Array(60).fill('x'),
      });

      expect(leido.ingredientes).toHaveLength(40);
      expect(leido.pasos).toHaveLength(40);
    });

    it('[E] la ficha sólo conserva dígitos y las cantidades que no son números se vacían', () => {
      const leido = leerAlterado({
        porciones: '4; DROP TABLE',
        tiempoMinutos: { $gt: 0 },
        calorias: 270,
        ingredientes: [
          { cantidad: { $gt: 0 }, unidad: 'g', nombre: 'a' },
          { cantidad: '5', unidad: 'g', nombre: 'b' },
          { cantidad: Infinity, unidad: 'g', nombre: 'c' },
        ],
        pasos: [1, null, { x: 1 }, 'ok'],
      });

      expect(leido.porciones).toBe('4');
      expect(leido.tiempoMinutos).toBe('');
      expect(leido.calorias).toBe('');
      expect(leido.ingredientes.map((fila) => fila.cantidad)).toEqual([null, null, null]);
      expect(leido.pasos).toEqual(['', '', '', 'ok']);
    });

    it('[E] un borrador alterado que queda sin datos se ignora', () => {
      localStorage.setItem(
        'borrador:u1',
        JSON.stringify({ titulo: 5, mensaje: null, ingredientes: 'x', pasos: {} }),
      );

      expect(borrador.leer()).toBeNull();
    });

    it('[B] una fecha inválida se reemplaza por la actual', () => {
      const leido = leerAlterado({ guardadoEn: 'ayer' });

      expect(Number.isNaN(Date.parse(leido.guardadoEn))).toBe(false);
    });
  });

  it('[E] si el almacenamiento falla al guardar, no rompe y no avisa que guardó', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('lleno', 'QuotaExceededError');
    });

    expect(borrador.guardar(conDatos)).toBeNull();
  });

  it('[E] si el almacenamiento falla al leer o borrar, no rompe', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });

    expect(borrador.leer()).toBeNull();
    expect(() => borrador.borrar()).not.toThrow();
  });

  describe('borradorVacio', () => {
    it('[B] unos espacios no cuentan como contenido, pero un costo sí', () => {
      expect(borradorVacio({ ...vacio, titulo: '   ', pasos: ['  '] })).toBe(true);
      expect(borradorVacio({ ...vacio, costo: 1 })).toBe(false);
      expect(
        borradorVacio({ ...vacio, ingredientes: [{ cantidad: 2, unidad: 'g', nombre: '' }] }),
      ).toBe(false);
    });
  });
});
