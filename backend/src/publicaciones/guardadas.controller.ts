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
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { ListarGuardadasDto } from './dto/listar-guardadas.dto.js';
import { GuardadasService } from './guardadas.service.js';

@Controller()
@UseGuards(AuthGuard)
export class GuardadasController {
  constructor(private readonly guardadasService: GuardadasService) {}

  @Post('publicaciones/:id/guardar')
  @HttpCode(200)
  guardar(@Param() { id }: IdParamDto, @Req() solicitud: SolicitudAutenticada) {
    return this.guardadasService.guardar(id, solicitud.usuario.id);
  }

  @Delete('publicaciones/:id/guardar')
  @HttpCode(204)
  quitar(@Param() { id }: IdParamDto, @Req() solicitud: SolicitudAutenticada) {
    return this.guardadasService.quitar(id, solicitud.usuario.id);
  }

  @Get('guardadas')
  listar(
    @Query() consulta: ListarGuardadasDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.guardadasService.listar(consulta, solicitud.usuario.id);
  }

  @Get('guardadas/letras')
  letras(
    @Query() consulta: ListarGuardadasDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.guardadasService.letras(consulta, solicitud.usuario.id);
  }
}
