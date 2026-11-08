import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import {
  MAXIMO_FOTOS_PASOS,
  TAMANO_MAXIMO_IMAGEN,
} from '../imagenes/imagenes.constantes.js';
import { ArchivosPublicacionPipe } from './archivos-publicacion.pipe.js';
import type { ArchivosPublicacion } from './archivos-publicacion.pipe.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publicaciones')
@UseGuards(AuthGuard)
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imagen', maxCount: 1 },
        { name: 'imagenesPasos', maxCount: MAXIMO_FOTOS_PASOS },
      ],
      { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } },
    ),
  )
  crear(
    @Req() solicitud: SolicitudAutenticada,
    @Body() dto: CrearPublicacionDto,
    @UploadedFiles(ArchivosPublicacionPipe) archivos: ArchivosPublicacion,
  ) {
    return this.publicacionesService.crear(solicitud.usuario.id, dto, archivos);
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
