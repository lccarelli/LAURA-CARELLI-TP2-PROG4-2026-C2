import { Publicacion } from '../app/interfaces/publicacion';

export const publicacionDePrueba = (
  numero: number,
  cambios?: Partial<Publicacion>,
): Publicacion => ({
  _id: `id${numero}`,
  usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  tipo: 'experiencia',
  cantidadMeGusta: 7,
  cantidadComentarios: 2,
  titulo: `Título ${numero}`,
  mensaje: `Mensaje ${numero}`,
  fecha: '2026-10-22T15:30:00',
  ...cambios,
});
