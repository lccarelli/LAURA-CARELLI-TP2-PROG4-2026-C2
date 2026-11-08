import { Injectable, PipeTransform } from '@nestjs/common';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';

export type ArchivosPublicacion = {
  imagen?: Express.Multer.File[];
  imagenesPasos?: Express.Multer.File[];
};

@Injectable()
export class ArchivosPublicacionPipe implements PipeTransform {
  private readonly validar = imagenOpcional();

  async transform(archivos: ArchivosPublicacion = {}) {
    await this.validar.transform(archivos.imagen);
    await this.validar.transform(archivos.imagenesPasos);
    return archivos;
  }
}
