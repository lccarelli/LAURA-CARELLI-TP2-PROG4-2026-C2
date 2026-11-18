import {
  Body,
  Controller,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { ApiMultipart, UNA_IMAGEN } from '../common/api-multipart.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from '../imagenes/imagenes.constantes.js';
import { EditarPerfilDto } from './dto/editar-perfil.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios/yo')
@ApiTags(ETIQUETAS.perfiles.nombre)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PerfilController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Editar mi perfil (foto opcional)' })
  @ApiMultipart(UNA_IMAGEN, EditarPerfilDto)
  @Put()
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } }),
  )
  editar(
    @Req() solicitud: SolicitudAutenticada,
    @Body() dto: EditarPerfilDto,
    @UploadedFile(imagenOpcional()) imagen?: Express.Multer.File,
  ) {
    return this.usuariosService.editarPerfil(solicitud.usuario.id, dto, imagen);
  }
}
