import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@UseGuards(AuthGuard)
export class PerfilAjenoController {
  constructor(private readonly usuariosService: UsuariosService) {}

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
