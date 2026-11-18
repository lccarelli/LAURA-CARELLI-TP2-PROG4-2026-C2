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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { CompartidasService } from './compartidas.service.js';
import { CompartirDto } from './dto/compartir.dto.js';

@Controller('publicaciones')
@ApiTags(ETIQUETAS.compartidas.nombre)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CompartidasController {
  constructor(private readonly compartidasService: CompartidasService) {}

  @ApiOperation({ summary: 'Listar las publicaciones que me compartieron' })
  @Get('compartidas')
  listar(
    @Query() paginacion: PaginacionDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.compartidasService.listar(paginacion, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Cantidad de compartidas sin ver' })
  @Get('compartidas/sin-ver')
  sinVer(@Req() solicitud: SolicitudAutenticada) {
    return this.compartidasService.cantidadSinVer(solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Marcar las compartidas como vistas' })
  @Post('compartidas/marcar-vistas')
  @HttpCode(200)
  marcarVistas(@Req() solicitud: SolicitudAutenticada) {
    return this.compartidasService.marcarVistas(solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Compartir una publicación con otra persona' })
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
