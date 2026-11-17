import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { filtroDeBusqueda } from '../common/busqueda.js';
import {
  compararTitulos,
  inicialDe,
  LETRAS_DEL_INDICE,
} from '../common/inicial.js';
import { ListarGuardadasDto } from './dto/listar-guardadas.dto.js';
import { CAMPOS_AUTOR, PublicacionesService } from './publicaciones.service.js';
import { esClaveDuplicada } from '../common/clave-duplicada.js';
import { Guardada } from './schemas/guardada.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';

const MAXIMO_GUARDADAS_CONSULTADAS = 1000;

@Injectable()
export class GuardadasService {
  constructor(
    @InjectModel(Guardada.name)
    private readonly guardadaModel: Model<Guardada>,
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    private readonly publicaciones: PublicacionesService,
  ) {}

  async guardar(id: string, usuarioId: string) {
    const existe = await this.publicacionModel.exists({
      _id: id,
      activa: true,
    });
    if (!existe) {
      throw new NotFoundException({
        message: 'La publicación no existe',
        codigo: 'PUBLICACION_NO_ENCONTRADA',
      });
    }
    try {
      await this.guardadaModel.create({ usuario: usuarioId, publicacion: id });
    } catch (error) {
      if (esClaveDuplicada(error)) {
        throw new ConflictException({
          message: 'Ya guardaste esta publicación',
          codigo: 'GUARDADA_REPETIDA',
        });
      }
      throw error;
    }
    const cantidadGuardados = await this.publicaciones.sumarContador(
      id,
      'cantidadGuardados',
      1,
    );
    return { guardada: true, cantidadGuardados };
  }

  async quitar(id: string, usuarioId: string) {
    const { deletedCount } = await this.guardadaModel.deleteOne({
      usuario: usuarioId,
      publicacion: id,
    });
    if (!deletedCount) {
      throw new NotFoundException({
        message: 'No habías guardado esta publicación',
        codigo: 'GUARDADA_INEXISTENTE',
      });
    }
    const cantidadGuardados = await this.publicaciones.sumarContador(
      id,
      'cantidadGuardados',
      -1,
    );
    return { guardada: false, cantidadGuardados };
  }

  async listar(consulta: ListarGuardadasDto, usuarioId: string) {
    const { offset, limit, letra } = consulta;
    const ordenadas = await this.ordenadas(consulta, usuarioId);
    const delaLetra = letra
      ? ordenadas.filter(({ titulo }) => inicialDe(titulo) === letra)
      : ordenadas;
    const pagina = delaLetra.slice(offset, offset + limit);
    return {
      datos: await this.publicaciones.marcarDelUsuario(pagina, usuarioId),
      offset,
      limit,
      hayMas: delaLetra.length > offset + limit,
    };
  }

  async letras(consulta: ListarGuardadasDto, usuarioId: string) {
    const ordenadas = await this.ordenadas(consulta, usuarioId);
    const cantidades = Object.fromEntries(
      LETRAS_DEL_INDICE.map((letra) => [letra, 0]),
    );
    for (const { titulo } of ordenadas) {
      cantidades[inicialDe(titulo)] += 1;
    }
    return { letras: cantidades, total: ordenadas.length };
  }

  private async ordenadas({ tipo, q }: ListarGuardadasDto, usuarioId: string) {
    const guardadas = await this.guardadaModel
      .find({ usuario: usuarioId })
      .sort({ fecha: -1 })
      .limit(MAXIMO_GUARDADAS_CONSULTADAS)
      .select('publicacion')
      .lean();
    const publicaciones = await this.publicacionModel
      .find({
        _id: { $in: guardadas.map(({ publicacion }) => publicacion) },
        activa: true,
        ...(tipo && { tipo }),
        ...(q && filtroDeBusqueda(q)),
      })
      .populate('usuario', CAMPOS_AUTOR)
      .lean();
    return publicaciones.sort((a, b) => compararTitulos(a.titulo, b.titulo));
  }
}
