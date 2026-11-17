import {
  Body,
  Controller,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { SolicitudAutenticada } from '../auth/auth.guard.js';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from '../imagenes/imagenes.constantes.js';
import { EditarPerfilDto } from './dto/editar-perfil.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios/yo')
@UseGuards(AuthGuard)
export class PerfilController {
  constructor(private readonly usuariosService: UsuariosService) {}

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
