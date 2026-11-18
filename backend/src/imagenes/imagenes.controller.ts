import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiMultipart, UNA_IMAGEN } from '../common/api-multipart.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { Destino } from './destinos.js';
import { ListarImagenesDto } from './dto/listar-imagenes.dto.js';
import { imagenOpcional } from './imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from './imagenes.constantes.js';
import { ImagenesService } from './imagenes.service.js';

@Controller('imagenes')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ImagenesController {
  constructor(private readonly imagenesService: ImagenesService) {}

  @ApiOperation({ summary: 'Subir una imagen' })
  @ApiMultipart(UNA_IMAGEN)
  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } }),
  )
  subir(
    @Req() solicitud: SolicitudAutenticada,
    @UploadedFile(imagenOpcional()) imagen?: Express.Multer.File,
  ) {
    if (!imagen) {
      throw new BadRequestException({
        message: 'Falta el archivo imagen',
        codigo: 'IMAGEN_REQUERIDA',
      });
    }
    return this.imagenesService.guardar(
      imagen,
      Destino.GALERIA,
      solicitud.usuario.id,
    );
  }

  @ApiOperation({ summary: 'Listar mis imágenes' })
  @Get()
  listar(
    @Req() solicitud: SolicitudAutenticada,
    @Query() { offset, limit, destino }: ListarImagenesDto,
  ) {
    return this.imagenesService.listar(
      solicitud.usuario.id,
      offset,
      limit,
      destino,
    );
  }

  @ApiOperation({ summary: 'Obtener una imagen' })
  @Get(':id')
  obtener(@Param() { id }: IdParamDto) {
    return this.imagenesService.obtener(id);
  }

  @ApiOperation({ summary: 'Borrar una imagen propia' })
  @Delete(':id')
  @HttpCode(204)
  borrar(@Req() solicitud: SolicitudAutenticada, @Param() { id }: IdParamDto) {
    return this.imagenesService.borrar(id, solicitud.usuario.id);
  }
}
