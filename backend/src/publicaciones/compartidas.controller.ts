import {
  Body,
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
import { PaginacionDto } from '../common/paginacion.dto.js';
import { CompartidasService } from './compartidas.service.js';
import { CompartirDto } from './dto/compartir.dto.js';

@Controller('publicaciones')
@UseGuards(AuthGuard)
export class CompartidasController {
  constructor(private readonly compartidasService: CompartidasService) {}

  @Get('compartidas')
  listar(
    @Query() paginacion: PaginacionDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.compartidasService.listar(paginacion, solicitud.usuario.id);
  }

  @Get('compartidas/sin-ver')
  sinVer(@Req() solicitud: SolicitudAutenticada) {
    return this.compartidasService.cantidadSinVer(solicitud.usuario.id);
  }

  @Post('compartidas/marcar-vistas')
  @HttpCode(200)
  marcarVistas(@Req() solicitud: SolicitudAutenticada) {
    return this.compartidasService.marcarVistas(solicitud.usuario.id);
  }

  @Post(':id/compartir')
  @HttpCode(201)
  compartir(
    @Param() { id }: IdParamDto,
    @Body() { usuarios }: CompartirDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.compartidasService.compartir(
      id,
      solicitud.usuario.id,
      usuarios,
    );
  }
}
