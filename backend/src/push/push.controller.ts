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
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { BajaPushDto, SuscribirPushDto } from './dto/suscribir-push.dto.js';
import { PushService } from './push.service.js';

@Controller('push')
@UseGuards(AuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('clave-publica')
  clavePublica() {
    return this.push.clavePublica();
  }

  @Post('suscripciones')
  @HttpCode(204)
  suscribir(
    @Body() dto: SuscribirPushDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.push.suscribir(solicitud.usuario.id, dto);
  }

  @Delete('suscripciones')
  @HttpCode(204)
  quitar(@Body() dto: BajaPushDto, @Req() solicitud: SolicitudAutenticada) {
    return this.push.quitar(solicitud.usuario.id, dto.endpoint);
  }
}
