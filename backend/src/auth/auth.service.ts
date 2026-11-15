import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { authConfig } from './auth.config.js';
import { IngresarDto } from './dto/ingresar.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@Injectable()
export class AuthService {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly usuariosService: UsuariosService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.crear(AuthService.name);
  }

  async registro(dto: RegistroDto, imagen?: Express.Multer.File) {
    const perfil =
      dto.correo.toLowerCase() === this.config.correoAdmin
        ? 'administrador'
        : 'usuario';
    const usuario = await this.usuariosService.registrar(dto, perfil, imagen);
    this.logger.info(EVENTOS_DE_LOG.USUARIO_REGISTRADO, 'Usuario registrado', {
      id_usuario: String(usuario!._id),
      nombre_usuario: usuario!.nombreUsuario,
      perfil,
    });
    return { token: this.generarToken(usuario!), usuario };
  }

  async ingresar(dto: IngresarDto) {
    const encontrado = await this.usuariosService.buscarPorIdentificador(
      dto.identificador,
    );
    const coincide =
      encontrado && (await bcrypt.compare(dto.clave, encontrado.clave));
    if (!encontrado || !coincide) {
      this.logger.advertir(
        EVENTOS_DE_LOG.INGRESO_FALLIDO,
        'Ingreso fallido: credenciales inválidas',
      );
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        codigo: 'CREDENCIALES_INVALIDAS',
      });
    }

    if (!encontrado.habilitado) {
      this.logger.advertir(
        EVENTOS_DE_LOG.INGRESO_RECHAZADO,
        'Ingreso rechazado: usuario deshabilitado',
        {
          id_usuario: String(encontrado._id),
          nombre_usuario: encontrado.nombreUsuario,
        },
      );
      throw new ForbiddenException({
        message: 'Usuario deshabilitado',
        codigo: 'USUARIO_DESHABILITADO',
      });
    }

    this.logger.info(EVENTOS_DE_LOG.INGRESO_CORRECTO, 'Ingreso correcto', {
      id_usuario: String(encontrado._id),
      nombre_usuario: encontrado.nombreUsuario,
    });

    const { clave: _clave, ...usuario } = encontrado;
    return { token: this.generarToken(usuario), usuario };
  }

  verificarToken(token: string) {
    try {
      const payload = jwt.verify(
        token,
        this.config.secretoJwt,
      ) as jwt.JwtPayload;
      return {
        id: payload.sub as string,
        perfil: payload.perfil as string,
        nombreUsuario: payload.nombreUsuario as string | undefined,
        inicio: (payload.inicio ?? payload.iat) as number,
      };
    } catch (error) {
      this.logger.advertir(EVENTOS_DE_LOG.TOKEN_RECHAZADO, 'Token rechazado', {
        motivo: (error as Error).message,
      });
      throw new UnauthorizedException({
        message: 'Token inválido o vencido',
        codigo: 'TOKEN_INVALIDO',
      });
    }
  }

  async autorizar(usuario: { id: string; nombreUsuario?: string }) {
    return { usuario: await this.buscarHabilitado(usuario) };
  }

  async refrescar(usuario: {
    id: string;
    perfil: string;
    nombreUsuario?: string;
    inicio: number;
  }) {
    const ahora = Math.floor(Date.now() / 1000);
    if (ahora - usuario.inicio > this.config.duracionMaximaSesionSegundos) {
      this.logger.advertir(
        EVENTOS_DE_LOG.SESION_VENCIDA,
        'La sesión alcanzó su duración máxima',
        { id_usuario: usuario.id, nombre_usuario: usuario.nombreUsuario },
      );
      throw new UnauthorizedException({
        message: 'La sesión alcanzó su duración máxima',
        codigo: 'SESION_VENCIDA',
      });
    }

    const encontrado = await this.buscarHabilitado(usuario);
    this.logger.info(EVENTOS_DE_LOG.TOKEN_REFRESCADO, 'Token refrescado', {
      id_usuario: usuario.id,
      nombre_usuario: usuario.nombreUsuario,
    });
    return { token: this.generarToken(encontrado, usuario.inicio) };
  }

  private async buscarHabilitado(usuario: {
    id: string;
    nombreUsuario?: string;
  }) {
    const encontrado = Types.ObjectId.isValid(usuario.id)
      ? await this.usuariosService.buscarPorId(usuario.id)
      : null;
    if (!encontrado?.habilitado) {
      this.logger.advertir(
        EVENTOS_DE_LOG.USUARIO_NO_AUTORIZADO,
        'Usuario inexistente o deshabilitado',
        { id_usuario: usuario.id, nombre_usuario: usuario.nombreUsuario },
      );
      throw new UnauthorizedException({
        message: 'Usuario no autorizado',
        codigo: 'USUARIO_NO_AUTORIZADO',
      });
    }
    return encontrado;
  }

  private generarToken(
    usuario: { _id: unknown; perfil: string; nombreUsuario?: string },
    inicio = Math.floor(Date.now() / 1000),
  ) {
    return jwt.sign(
      {
        sub: String(usuario._id),
        perfil: usuario.perfil,
        nombreUsuario: usuario.nombreUsuario,
        inicio,
      },
      this.config.secretoJwt,
      { expiresIn: this.config.expiraJwt },
    );
  }
}
