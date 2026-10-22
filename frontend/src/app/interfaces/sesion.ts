import { Usuario } from './usuario';

export interface Sesion {
  token: string;
  usuario: Usuario;
}
