import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import {
  ApiMultipart,
  IMAGEN_Y_FOTOS_DE_PASOS,
} from '../common/api-multipart.decorator.js';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import {
  MAXIMO_FOTOS_PASOS,
  TAMANO_MAXIMO_IMAGEN,
} from '../imagenes/imagenes.constantes.js';
import { ArchivosPublicacionPipe } from './archivos-publicacion.pipe.js';
import type { ArchivosPublicacion } from './archivos-publicacion.pipe.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { EditarPublicacionDto } from './dto/editar-publicacion.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publicaciones')
@ApiTags(ETIQUETAS.publicaciones.nombre)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @ApiOperation({
    summary: 'Crear una publicación (portada y fotos de pasos opcionales)',
  })
  @ApiMultipart(IMAGEN_Y_FOTOS_DE_PASOS, CrearPublicacionDto)
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

  @ApiOperation({ summary: 'Editar una publicación propia' })
  @ApiMultipart(IMAGEN_Y_FOTOS_DE_PASOS, EditarPublicacionDto)
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imagen', maxCount: 1 },
        { name: 'imagenesPasos', maxCount: MAXIMO_FOTOS_PASOS },
      ],
      { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } },
    ),
  )
  editar(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
    @Body() dto: EditarPublicacionDto,
    @UploadedFiles(ArchivosPublicacionPipe) archivos: ArchivosPublicacion,
  ) {
    return this.publicacionesService.editar(
      id,
      solicitud.usuario.id,
      dto,
      archivos,
    );
  }

  @ApiOperation({ summary: 'Listar y buscar publicaciones' })
  @Get()
  listar(
    @Query() consulta: ListarPublicacionesDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.listar(consulta, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Obtener una publicación' })
  @Get(':id')
  obtener(@Param() { id }: IdParamDto, @Req() solicitud: SolicitudAutenticada) {
    return this.publicacionesService.obtener(id, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Eliminar una publicación (dueño o administrador)' })
  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.eliminar(id, solicitud.usuario);
  }
}
