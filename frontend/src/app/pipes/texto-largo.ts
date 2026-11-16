import { Pipe, PipeTransform } from '@angular/core';
import { acortar } from '../utilidades/textos';

@Pipe({ name: 'textoLargo' })
export class TextoLargo implements PipeTransform {
  transform(texto: string | null | undefined, maximo: number): string {
    return texto ? acortar(texto, maximo, true) : '';
  }
}
