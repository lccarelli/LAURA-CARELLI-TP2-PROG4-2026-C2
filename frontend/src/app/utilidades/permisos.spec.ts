import { usuarioDePrueba } from '../../testing/usuario';
import { publicacionDePrueba } from '../../testing/publicacion';
import { puedeEliminarPublicacion } from './permisos';

describe('puedeEliminarPublicacion', () => {
  const ajena = publicacionDePrueba(1, {
    usuario: { _id: 'otra', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' },
  });
  const propia = publicacionDePrueba(2, {
    usuario: {
      _id: usuarioDePrueba._id,
      nombre: 'Laura',
      apellido: 'Carelli',
      nombreUsuario: 'laura_c',
    },
  });

  it('[Z] sin sesión nadie puede eliminar', () => {
    expect(puedeEliminarPublicacion(null, propia)).toBe(false);
  });

  it('[O] quien publicó puede eliminar la suya', () => {
    expect(puedeEliminarPublicacion(usuarioDePrueba, propia)).toBe(true);
  });

  it('[E] una persona común no puede eliminar la de otra', () => {
    expect(puedeEliminarPublicacion(usuarioDePrueba, ajena)).toBe(false);
  });

  it('[S] una persona con perfil administrador puede eliminar la de otra', () => {
    expect(puedeEliminarPublicacion({ ...usuarioDePrueba, perfil: 'administrador' }, ajena)).toBe(
      true,
    );
  });
});
