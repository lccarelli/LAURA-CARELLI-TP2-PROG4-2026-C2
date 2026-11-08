import { Component } from '@angular/core';

const FOTOS = [
  { archivo: 'locro-y-empanadas', ancha: true },
  { archivo: 'asado', alta: true },
  { archivo: 'locro' },
  { archivo: 'alfajores' },
  { archivo: 'humitas' },
  { archivo: 'guiso' },
];

@Component({
  selector: 'app-mosaico-comidas',
  host: { class: 'mosaico-contenedor' },
  templateUrl: './mosaico-comidas.html',
})
export class MosaicoComidas {
  protected readonly fotos = FOTOS;
}
