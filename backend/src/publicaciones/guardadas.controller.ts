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
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { ListarGuardadasDto } from './dto/listar-guardadas.dto.js';
import { GuardadasService } from './guardadas.service.js';

@Controller()
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class GuardadasController {
  constructor(private readonly guardadasService: GuardadasService) {}

  @ApiOperation({ summary: 'Listar mis publicaciones guardadas' })
  @Get('publicaciones/guardadas')
  listar(
    @Query() consulta: ListarGuardadasDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.guardadasService.listar(consulta, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Letras iniciales de las guardadas' })
  @Get('publicaciones/guardadas/letras')
  letras(
    @Query() consulta: ListarGuardadasDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.guardadasService.letras(consulta, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Guardar una publicación' })
  @Post('publicaciones/:id/guardar')
  guardar(@Param() { id }: IdParamDto, @Req() solicitud: SolicitudAutenticada) {
    return this.guardadasService.guardar(id, solicitud.usuario.id);
  }

  @ApiOperation({ summary: 'Quitar una publicación de las guardadas' })
  @Post('publicaciones/:id/quitar-guardado')
  @HttpCode(200)
  quitar(@Param() { id }: IdParamDto, @Req() solicitud: SolicitudAutenticada) {
    return this.guardadasService.quitar(id, solicitud.usuario.id);
  }
}
