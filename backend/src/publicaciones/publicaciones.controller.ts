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
import { ComentariosService } from './comentarios.service.js';
import type { ArchivosPublicacion } from './archivos-publicacion.pipe.js';
import { ComentarioParamDto } from './dto/comentario-param.dto.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { EditarComentarioDto } from './dto/editar-comentario.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publicaciones')
@UseGuards(AuthGuard)
export class PublicacionesController {
  constructor(
    private readonly publicacionesService: PublicacionesService,
    private readonly comentariosService: ComentariosService,
  ) {}

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
  listar(
    @Query() consulta: ListarPublicacionesDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.listar(consulta, solicitud.usuario.id);
  }

  @Get(':id')
  obtener(@Param() { id }: IdParamDto, @Req() solicitud: SolicitudAutenticada) {
    return this.publicacionesService.obtener(id, solicitud.usuario.id);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.eliminar(id, solicitud.usuario);
  }

  @Post(':id/megusta')
  darMeGusta(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.darMeGusta(id, solicitud.usuario.id);
  }

  @Delete(':id/megusta')
  @HttpCode(204)
  quitarMeGusta(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.quitarMeGusta(id, solicitud.usuario.id);
  }

  @Get(':id/comentarios')
  listarComentarios(
    @Param() { id }: IdParamDto,
    @Query() paginacion: PaginacionDto,
  ) {
    return this.comentariosService.listar(id, paginacion);
  }

  @Post(':id/comentarios')
  comentar(
    @Param() { id }: IdParamDto,
    @Body() dto: CrearComentarioDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.comentariosService.crear(id, solicitud.usuario.id, dto);
  }

  @Put(':publicacionId/comentarios/:comentarioId')
  editarComentario(
    @Param() { publicacionId, comentarioId }: ComentarioParamDto,
    @Body() dto: EditarComentarioDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.comentariosService.editar(
      publicacionId,
      comentarioId,
      solicitud.usuario.id,
      dto,
    );
  }
}
