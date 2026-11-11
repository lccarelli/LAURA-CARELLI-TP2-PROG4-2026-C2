import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from '../imagenes/imagenes.constantes.js';
import { ActualizarHabilitadoDto } from './dto/actualizar-habilitado.dto.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@UseGuards(AuthGuard, AdminGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(@Query() { offset, limit }: PaginacionDto) {
    return this.usuariosService.listar(offset, limit);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } }),
  )
  crear(
    @Req() solicitud: SolicitudAutenticada,
    @Body() dto: CrearUsuarioDto,
    @UploadedFile(imagenOpcional()) imagen?: Express.Multer.File,
  ) {
    return this.usuariosService.crearComoAdministrador(
      solicitud.usuario.id,
      dto,
      imagen,
    );
  }

  @Patch(':id')
  actualizarHabilitado(
    @Param() { id }: IdParamDto,
    @Body() { habilitado }: ActualizarHabilitadoDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.usuariosService.actualizarHabilitado(
      id,
      habilitado,
      solicitud.usuario.id,
    );
  }
}
