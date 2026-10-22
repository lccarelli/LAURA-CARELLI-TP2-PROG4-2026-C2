import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { IdParamDto } from '../common/id-param.dto.js';
import { ImagenesService } from './imagenes.service.js';

@Controller('imagenes')
export class ImagenesController {
  constructor(private readonly imagenesService: ImagenesService) {}

  @Get(':id')
  async obtener(
    @Param() { id }: IdParamDto,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const imagen = await this.imagenesService.obtener(id);
    respuesta.set({
      'Content-Type': imagen.mimeType,
      'Cache-Control': 'public, max-age=86400',
    });
    return new StreamableFile(imagen.data);
  }
}
