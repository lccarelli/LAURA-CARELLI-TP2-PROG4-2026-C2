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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ETIQUETAS } from '../etiquetas-swagger.js';
import { ApiMultipart, UNA_IMAGEN } from '../common/api-multipart.decorator.js';
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
@ApiTags(ETIQUETAS.autenticacion.nombre)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Registrar una cuenta (con foto opcional)' })
  @ApiMultipart(UNA_IMAGEN, RegistroDto)
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

  @ApiOperation({ summary: 'Ingresar con correo o usuario y clave' })
  @Post('ingresar')
  @Throttle(LIMITES_AUTENTICACION)
  @HttpCode(200)
  ingresar(@Body() dto: IngresarDto) {
    return this.authService.ingresar(dto);
  }

  @ApiOperation({ summary: 'Ingresar o registrarse con Google' })
  @Post('google')
  @Throttle(LIMITES_AUTENTICACION)
  @HttpCode(200)
  google(@Body() dto: GoogleDto) {
    return this.authService.google(dto);
  }

  @ApiOperation({ summary: 'Ingresar con la cuenta de acceso docente' })
  @Post('acceso-docente')
  @Throttle(LIMITES_AUTENTICACION)
  @HttpCode(200)
  accesoDocente() {
    return this.authService.accesoDocente();
  }

  @ApiOperation({ summary: 'Validar el token y devolver el usuario actual' })
  @ApiBearerAuth()
  @Post('autorizar')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  autorizar(@Req() solicitud: SolicitudAutenticada) {
    return this.authService.autorizar(solicitud.usuario);
  }

  @ApiOperation({ summary: 'Renovar el token (hasta 12 horas de sesión)' })
  @ApiBearerAuth()
  @Post('refrescar')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  refrescar(@Req() solicitud: SolicitudAutenticada) {
    return this.authService.refrescar(solicitud.usuario);
  }
}
