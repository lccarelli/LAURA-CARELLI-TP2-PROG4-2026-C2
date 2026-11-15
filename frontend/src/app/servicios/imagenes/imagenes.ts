import { Service } from '@angular/core';
import { prepararImagen } from '../../utilidades/imagen';

@Service()
export class Imagenes {
  preparar(archivo: File) {
    return prepararImagen(archivo);
  }
}
