import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { BajaPushDto, SuscribirPushDto } from './dto/suscribir-push.dto.js';
import { PushService } from './push.service.js';

@Controller('push')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PushController {
  constructor(private readonly push: PushService) {}

  @ApiOperation({
    summary: 'Clave pública para suscribirse a las notificaciones push',
  })
  @Get('clave-publica')
  clavePublica() {
    return this.push.clavePublica();
  }

  @ApiOperation({
    summary: 'Suscribir este dispositivo a las notificaciones push',
  })
  @Post('suscripciones')
  @HttpCode(204)
  suscribir(
    @Body() dto: SuscribirPushDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.push.suscribir(solicitud.usuario.id, dto);
  }

  @ApiOperation({ summary: 'Dar de baja la suscripción push' })
  @Delete('suscripciones')
  @HttpCode(204)
  quitar(@Body() dto: BajaPushDto, @Req() solicitud: SolicitudAutenticada) {
    return this.push.quitar(solicitud.usuario.id, dto.endpoint);
  }
}
