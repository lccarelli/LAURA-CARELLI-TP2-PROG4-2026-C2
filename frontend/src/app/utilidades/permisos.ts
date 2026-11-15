import { Publicacion } from '../interfaces/publicacion';
import { Usuario } from '../interfaces/usuario';

export function puedeEliminarPublicacion(
  usuario: Usuario | null,
  publicacion: Pick<Publicacion, 'usuario'>,
) {
  return (
    usuario !== null &&
    (usuario.perfil === 'administrador' || usuario._id === publicacion.usuario._id)
  );
}
