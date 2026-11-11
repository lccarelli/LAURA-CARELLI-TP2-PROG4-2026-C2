import { Usuario } from '../app/interfaces/usuario';

export const usuarioDePrueba: Usuario = {
  _id: 'u1',
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: '',
  perfil: 'usuario',
  habilitado: true,
};

export const datosDelFormulario = {
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  clave: 'Clave1234',
  repetirClave: 'Clave1234',
  fechaNacimiento: '1990-05-20',
  descripcion: 'Estudiante',
  perfil: 'usuario',
};
