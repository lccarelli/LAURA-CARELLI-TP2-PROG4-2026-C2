import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RangoFechasDto } from './dto/rango-fechas.dto.js';
import { EstadisticasService } from './estadisticas.service.js';

@Controller('estadisticas')
@UseGuards(AuthGuard, AdminGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('resumen')
  resumen(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.resumen(desde, hasta);
  }

  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.publicacionesPorUsuario(desde, hasta);
  }

  @Get('comentarios-por-dia')
  comentariosPorDia(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.comentariosPorDia(desde, hasta);
  }

  @Get('publicaciones-por-tipo')
  publicacionesPorTipo(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.publicacionesPorTipo(desde, hasta);
  }

  @Get('ingresos-por-usuario')
  ingresosPorUsuario(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.ingresosPorUsuario(desde, hasta);
  }

  @Get('visitas-a-mi-perfil')
  visitasAPerfiles(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.visitasAPerfiles(desde, hasta);
  }

  @Get('megusta-por-dia')
  meGustaPorDia(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.meGustaPorDia(desde, hasta);
  }

  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(@Query() { desde, hasta }: RangoFechasDto) {
    return this.estadisticasService.comentariosPorPublicacion(desde, hasta);
  }
}
