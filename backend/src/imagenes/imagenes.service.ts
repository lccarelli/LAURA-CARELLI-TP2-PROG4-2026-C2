import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { Publicacion } from '../publicaciones/schemas/publicacion.schema.js';
import { Usuario } from '../usuarios/schemas/usuario.schema.js';
import { CloudinaryCliente } from './cloudinary.cliente.js';
import type { Destino } from './destinos.js';
import { Imagen } from './schemas/imagen.schema.js';

@Injectable()
export class ImagenesService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Imagen.name) private readonly imagenModel: Model<Imagen>,
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly cloudinary: CloudinaryCliente,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(ImagenesService.name);
  }

  async guardar(
    archivo: Express.Multer.File,
    destino: Destino,
    usuarioId: string,
    tipo: string = destino,
  ) {
    const nombre = `${usuarioId}-${tipo}-${Date.now()}`;
    const { url, publicId } = await this.cloudinary.subir(
      archivo,
      destino,
      nombre,
    );
    const creada = await this.imagenModel.create({
      url,
      publicId,
      destino,
      mimetype: archivo.mimetype,
      tamano: archivo.size,
      usuario: usuarioId,
    });
    this.logger.info(EVENTOS_DE_LOG.IMAGEN_SUBIDA, 'Imagen subida', {
      public_id: publicId,
      destino,
      tipo_mime: archivo.mimetype,
      tamano_bytes: archivo.size,
    });
    return creada.toObject();
  }

  async listar(
    usuarioId: string,
    offset: number,
    limit: number,
    destino?: Destino,
  ) {
    const imagenes = await this.imagenModel
      .find({ usuario: usuarioId, ...(destino && { destino }) })
      .sort({ fecha: -1, _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .lean();

    return {
      datos: imagenes.slice(0, limit),
      offset,
      limit,
      hayMas: imagenes.length > limit,
    };
  }

  async obtener(id: string) {
    const imagen = await this.imagenModel.findById(id).lean();
    if (!imagen) {
      throw new NotFoundException({
        message: 'La imagen no existe',
        codigo: 'IMAGEN_NO_ENCONTRADA',
      });
    }
    return imagen;
  }

  async borrar(id: string, usuarioId: string) {
    const imagen = await this.obtener(id);
    if (String(imagen.usuario) !== usuarioId) {
      throw new ForbiddenException({
        message: 'La imagen es de otro usuario',
        codigo: 'IMAGEN_AJENA',
      });
    }

    const enUso =
      (await this.publicacionModel.exists({ imagen: imagen.url })) ||
      (await this.usuarioModel.exists({ imagenPerfil: imagen.url }));
    if (enUso) {
      throw new ConflictException({
        message: 'La imagen está en uso',
        codigo: 'IMAGEN_EN_USO',
      });
    }

    await this.cloudinary.borrar(imagen.publicId);
    await this.imagenModel.deleteOne({ _id: id });
    this.logger.info(EVENTOS_DE_LOG.IMAGEN_BORRADA, 'Imagen borrada', {
      public_id: imagen.publicId,
    });
  }
}
