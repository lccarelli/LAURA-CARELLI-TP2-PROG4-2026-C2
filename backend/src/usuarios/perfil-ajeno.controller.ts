import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { DirectorioDto } from './dto/directorio.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@UseGuards(AuthGuard)
export class PerfilAjenoController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('directorio')
  directorio(
    @Query() { texto }: DirectorioDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.usuariosService.directorio(texto, solicitud.usuario.id);
  }

  @Post(':id/visitas')
  registrarVisita(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.usuariosService.registrarVisita(solicitud.usuario.id, id);
  }

  @Get(':id')
  obtener(@Param() { id }: IdParamDto) {
    return this.usuariosService.perfilPublico(id);
  }
}
