import {
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publicaciones')
@ApiTags(ETIQUETAS.meGusta.nombre)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class MeGustaController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @ApiOperation({ summary: 'Dar me gusta' })
  @Post(':id/megusta')
  darMeGusta(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.darMeGusta(id, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Quitar el me gusta' })
  @Delete(':id/megusta')
  @HttpCode(204)
  quitarMeGusta(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.publicacionesService.quitarMeGusta(id, solicitud.usuario.id);
  }
}
