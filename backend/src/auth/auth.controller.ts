import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { imagenOpcional } from '../imagenes/imagen-opcional.pipe.js';
import { TAMANO_MAXIMO_IMAGEN } from '../imagenes/imagenes.constantes.js';
import { LIMITES_AUTENTICACION } from '../configs/throttler.config.js';
import { AuthGuard } from './auth.guard.js';
import type { SolicitudAutenticada } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { GoogleDto } from './dto/google.dto.js';
import { IngresarDto } from './dto/ingresar.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @Throttle(LIMITES_AUTENTICACION)
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: TAMANO_MAXIMO_IMAGEN } }),
  )
  registro(
    @Body() dto: RegistroDto,
    @UploadedFile(imagenOpcional()) imagen?: Express.Multer.File,
  ) {
    return this.authService.registro(dto, imagen);
  }

  @Post('ingresar')
  @Throttle(LIMITES_AUTENTICACION)
  @HttpCode(200)
  ingresar(@Body() dto: IngresarDto) {
    return this.authService.ingresar(dto);
  }

  @Post('google')
  @Throttle(LIMITES_AUTENTICACION)
  @HttpCode(200)
  google(@Body() dto: GoogleDto) {
    return this.authService.google(dto);
  }

  @Post('acceso-docente')
  @Throttle(LIMITES_AUTENTICACION)
  @HttpCode(200)
  accesoDocente() {
    return this.authService.accesoDocente();
  }

  @Post('autorizar')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  autorizar(@Req() solicitud: SolicitudAutenticada) {
    return this.authService.autorizar(solicitud.usuario);
  }

  @Post('refrescar')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  refrescar(@Req() solicitud: SolicitudAutenticada) {
    return this.authService.refrescar(solicitud.usuario);
  }
}
