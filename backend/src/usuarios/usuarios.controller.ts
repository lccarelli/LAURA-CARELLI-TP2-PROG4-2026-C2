import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { ApiMultipart, UNA_IMAGEN } from '../common/api-multipart.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { PaginacionDto } from '../common/paginacion.dto.js';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from '../imagenes/imagenes.constantes.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@ApiTags(ETIQUETAS.administracion.nombre)
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Listar usuarios (administrador)' })
  @Get()
  listar(@Query() { offset, limit }: PaginacionDto) {
    return this.usuariosService.listar(offset, limit);
  }

  @ApiOperation({ summary: 'Crear un usuario (administrador)' })
  @ApiMultipart(UNA_IMAGEN, CrearUsuarioDto)
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

  @ApiOperation({ summary: 'Deshabilitar un usuario (administrador)' })
  @Delete(':id')
  deshabilitar(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.usuariosService.cambiarHabilitado(
      id,
      false,
      solicitud.usuario.id,
    );
  }

  @ApiOperation({ summary: 'Habilitar un usuario (administrador)' })
  @Post(':id/habilitar')
  @HttpCode(200)
  habilitar(
    @Param() { id }: IdParamDto,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.usuariosService.cambiarHabilitado(
      id,
      true,
      solicitud.usuario.id,
    );
  }
}
