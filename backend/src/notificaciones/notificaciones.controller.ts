import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { ListarNotificacionesDto } from './dto/listar-notificaciones.dto.js';
import { NotificacionesService } from './notificaciones.service.js';

@Controller('notificaciones')
@UseGuards(AuthGuard)
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  listar(
    @Query() consulta: ListarNotificacionesDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.notificaciones.listar(solicitud.usuario.id, consulta);
  }

  @Get('sin-leer')
  cantidadSinLeer(@Req() solicitud: SolicitudAutenticada) {
    return this.notificaciones.cantidadSinLeer(solicitud.usuario.id);
  }

  @Post('leer-todas')
  @HttpCode(200)
  marcarTodasLeidas(@Req() solicitud: SolicitudAutenticada) {
    return this.notificaciones.marcarTodasLeidas(solicitud.usuario.id);
  }

  @Post(':id/leer')
  @HttpCode(200)
  marcarLeida(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.notificaciones.marcarLeida(id, solicitud.usuario.id);
  }
}
