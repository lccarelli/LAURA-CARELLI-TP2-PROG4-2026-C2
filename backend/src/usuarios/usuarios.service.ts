import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { authConfig } from '../auth/auth.config.js';
import type { RegistroDto } from '../auth/dto/registro.dto.js';
import { Destino } from '../imagenes/destinos.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { Usuario } from './schemas/usuario.schema.js';

@Injectable()
export class UsuariosService {
  private readonly logger: ContextLogger;

  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly imagenesService: ImagenesService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(UsuariosService.name);
  }

  async crearComoAdministrador(
    administradorId: string,
    dto: CrearUsuarioDto,
    imagen?: Express.Multer.File,
  ) {
    const usuario = await this.registrar(dto, dto.perfil, imagen);
    this.logger.info(EVENTOS_DE_LOG.USUARIO_CREADO, 'Usuario creado', {
      id_usuario: String(usuario!._id),
      nombre_usuario: usuario!.nombreUsuario,
      perfil: usuario!.perfil,
      id_administrador: administradorId,
    });
    return usuario;
  }

  async registrar(
    dto: RegistroDto,
    perfil: string,
    imagen?: Express.Multer.File,
  ) {
    const fechaNacimiento = new Date(dto.fechaNacimiento);
    if (fechaNacimiento > new Date()) {
      throw new BadRequestException({
        message: 'fechaNacimiento no puede ser una fecha futura',
        codigo: 'FECHA_FUTURA',
      });
    }

    const clave = await bcrypt.hash(dto.clave, this.config.rondasBcrypt);
    const usuarioId = new Types.ObjectId();
    const imagenPerfil = imagen
      ? (
          await this.imagenesService.guardar(
            imagen,
            Destino.PERFILES,
            String(usuarioId),
          )
        ).url
      : undefined;

    return this.crear({
      ...dto,
      _id: usuarioId,
      clave,
      fechaNacimiento,
      perfil,
      imagenPerfil,
    });
  }

  async crear(datos: Partial<Usuario> & { _id?: Types.ObjectId }) {
    try {
      const creado = await this.usuarioModel.create(datos);
      return await this.usuarioModel.findById(creado._id).lean();
    } catch (error: any) {
      if (error.code === 11000) {
        const campo = Object.keys(error.keyPattern)[0];
        const esCorreo = campo === 'correo';
        throw new ConflictException({
          message: `El ${esCorreo ? 'correo' : 'nombre de usuario'} ya está registrado`,
          codigo: esCorreo ? 'CORREO_REPETIDO' : 'USUARIO_REPETIDO',
        });
      }
      throw error;
    }
  }

  buscarPorIdentificador(identificador: string) {
    return this.usuarioModel
      .findOne({
        $or: [{ correo: identificador }, { nombreUsuario: identificador }],
      })
      .select('+clave')
      .lean();
  }

  buscarPorId(id: string) {
    return this.usuarioModel.findById(id).lean();
  }

  async listar(offset: number, limit: number) {
    const usuarios = await this.usuarioModel
      .find()
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit + 1)
      .lean();

    return {
      datos: usuarios.slice(0, limit),
      offset,
      limit,
      hayMas: usuarios.length > limit,
    };
  }

  async actualizarHabilitado(
    id: string,
    habilitado: boolean,
    administradorId: string,
  ) {
    if (id === administradorId) {
      throw new BadRequestException({
        message: 'No se puede cambiar el estado de la propia cuenta',
        codigo: 'CUENTA_PROPIA',
      });
    }

    const resultado = await this.usuarioModel.updateOne(
      { _id: id },
      { habilitado },
    );
    if (resultado.matchedCount === 0) {
      throw new NotFoundException({
        message: 'El usuario no existe',
        codigo: 'USUARIO_NO_ENCONTRADO',
      });
    }
    if (resultado.modifiedCount > 0) {
      this.logger.info(
        habilitado
          ? EVENTOS_DE_LOG.USUARIO_HABILITADO
          : EVENTOS_DE_LOG.USUARIO_DESHABILITADO,
        habilitado ? 'Usuario habilitado' : 'Usuario deshabilitado',
        { id_usuario: id, id_administrador: administradorId },
      );
    }
    return this.usuarioModel.findById(id).lean();
  }
}
