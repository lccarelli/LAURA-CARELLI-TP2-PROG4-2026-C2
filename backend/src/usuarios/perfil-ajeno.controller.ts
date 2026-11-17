import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@UseGuards(AuthGuard)
export class PerfilAjenoController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get(':id')
  obtener(@Param() { id }: IdParamDto) {
    return this.usuariosService.perfilPublico(id);
  }
}
