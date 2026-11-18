import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { ComentariosService } from './comentarios.service.js';
import { ComentarioParamDto } from './dto/comentario-param.dto.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { EditarComentarioDto } from './dto/editar-comentario.dto.js';

@Controller('publicaciones')
@ApiTags(ETIQUETAS.comentarios.nombre)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @ApiOperation({ summary: 'Listar los comentarios de una publicación' })
  @Get(':id/comentarios')
  listarComentarios(
    @Param() { id }: IdParamDto,
    @Query() paginacion: PaginacionDto,
  ) {
    return this.comentariosService.listar(id, paginacion);
  }

  @ApiOperation({ summary: 'Comentar una publicación' })
  @Post(':id/comentarios')
  comentar(
    @Param() { id }: IdParamDto,
    @Body() dto: CrearComentarioDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.comentariosService.crear(id, solicitud.usuario.id, dto);
  }

  @ApiOperation({ summary: 'Editar un comentario propio' })
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
