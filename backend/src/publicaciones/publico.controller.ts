import { Controller, Get, Param, Query } from '@nestjs/common';
import { IdParamDto } from '../common/id-param.dto.js';
import { ComentariosService } from './comentarios.service.js';
import {
  COMENTARIOS_PUBLICOS,
  ListarPublicoDto,
} from './dto/listar-publico.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publico/publicaciones')
export class PublicoController {
  constructor(
    private readonly publicacionesService: PublicacionesService,
    private readonly comentariosService: ComentariosService,
  ) {}

  @Get()
  listar(@Query() { limit }: ListarPublicoDto) {
    return this.publicacionesService.listarPublico(limit);
  }

  @Get(':id')
  async obtener(@Param() { id }: IdParamDto) {
    const publicacion = await this.publicacionesService.obtenerPublico(id);
    const { datos } = await this.comentariosService.listar(id, {
      offset: 0,
      limit: COMENTARIOS_PUBLICOS,
    });
    return { ...publicacion, comentarios: datos };
  }
}
