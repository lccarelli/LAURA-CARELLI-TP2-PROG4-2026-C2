import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from '../imagenes/imagenes.constantes.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publicaciones')
@UseGuards(AuthGuard)
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } }),
  )
  crear(
    @Req() solicitud: SolicitudAutenticada,
    @Body() dto: CrearPublicacionDto,
    @UploadedFile(imagenOpcional()) imagen?: Express.Multer.File,
  ) {
    return this.publicacionesService.crear(solicitud.usuario.id, dto, imagen);
  }

  @Get()
  listar(@Query() { offset, limit }: PaginacionDto) {
    return this.publicacionesService.listar(offset, limit);
  }

  @Get(':id')
  obtener(@Param() { id }: IdParamDto) {
    return this.publicacionesService.obtener(id);
  }
}
