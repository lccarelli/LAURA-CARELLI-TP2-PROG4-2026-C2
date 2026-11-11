import { Comentario } from '../app/interfaces/comentario';

export const comentarioDePrueba = (cambios?: Partial<Comentario>): Comentario => ({
  _id: 'c1',
  publicacion: 'p1',
  usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  mensaje: 'Me salió riquísimo',
  fecha: '2026-10-22T15:30:00',
  modificado: false,
  ...cambios,
});
