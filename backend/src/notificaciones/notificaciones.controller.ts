import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { ListarNotificacionesDto } from './dto/listar-notificaciones.dto.js';
import { NotificacionesService } from './notificaciones.service.js';

@Controller('notificaciones')
@ApiTags(ETIQUETAS.notificaciones.nombre)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @ApiOperation({ summary: 'Listar mis notificaciones' })
  @Get()
  listar(
    @Query() consulta: ListarNotificacionesDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.notificaciones.listar(solicitud.usuario.id, consulta);
  }

  @ApiOperation({ summary: 'Cantidad de notificaciones sin leer' })
  @Get('sin-leer')
  cantidadSinLeer(@Req() solicitud: SolicitudAutenticada) {
    return this.notificaciones.cantidadSinLeer(solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Marcar todas como leídas' })
  @Post('leer-todas')
  @HttpCode(200)
  marcarTodasLeidas(@Req() solicitud: SolicitudAutenticada) {
    return this.notificaciones.marcarTodasLeidas(solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Marcar una como leída' })
  @Post(':id/leer')
  @HttpCode(200)
  marcarLeida(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.notificaciones.marcarLeida(id, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Eliminar una notificación' })
  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.notificaciones.eliminar(id, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Eliminar todas mis notificaciones' })
  @Delete()
  eliminarTodas(@Req() solicitud: SolicitudAutenticada) {
    return this.notificaciones.eliminarTodas(solicitud.usuario.id);
  }
}
