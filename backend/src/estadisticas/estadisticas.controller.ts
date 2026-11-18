import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RangoFechasDto } from './dto/rango-fechas.dto.js';
import { EstadisticasService } from './estadisticas.service.js';

@Controller('estadisticas')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @ApiOperation({
    summary: 'Resumen general de actividad en un rango de fechas',
  })
  @Get('resumen')
  resumen(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.resumen(desde, hasta);
  }

  @ApiOperation({ summary: 'Publicaciones por usuario' })
  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.publicacionesPorUsuario(desde, hasta);
  }

  @ApiOperation({ summary: 'Comentarios por día' })
  @Get('comentarios-por-dia')
  comentariosPorDia(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.comentariosPorDia(desde, hasta);
  }

  @ApiOperation({ summary: 'Publicaciones por tipo' })
  @Get('publicaciones-por-tipo')
  publicacionesPorTipo(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.publicacionesPorTipo(desde, hasta);
  }

  @ApiOperation({ summary: 'Ingresos por usuario' })
  @Get('ingresos-por-usuario')
  ingresosPorUsuario(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.ingresosPorUsuario(desde, hasta);
  }

  @ApiOperation({ summary: 'Visitas a perfiles de otras personas' })
  @Get('visitas-a-mi-perfil')
  visitasAPerfiles(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.visitasAPerfiles(desde, hasta);
  }

  @ApiOperation({ summary: 'Me gusta por día' })
  @Get('megusta-por-dia')
  meGustaPorDia(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.meGustaPorDia(desde, hasta);
  }

  @ApiOperation({ summary: 'Comentarios por publicación' })
  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.comentariosPorPublicacion(desde, hasta);
  }
}
