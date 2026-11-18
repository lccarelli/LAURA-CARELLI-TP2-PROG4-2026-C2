import {
  ForbiddenException,
  NotFoundException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import {
  EVENTOS_DE_LOG,
  LoggerFactory,
  ContextLogger,
} from '../logs/logs.factory.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { ALGORITMO_JWT, authConfig } from './auth.config.js';
import { IngresarDto } from './dto/ingresar.dto.js';
import { RegistroDto } from './dto/registro.dto.js';
import { ClienteGoogle } from './cliente-google.js';
import type { PerfilGoogle } from './cliente-google.js';
import { GoogleDto } from './dto/google.dto.js';
import { Ingreso } from './schemas/ingreso.schema.js';

@Injectable()
export class AuthService {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly usuariosService: UsuariosService,
    @InjectModel(Ingreso.name)
    private readonly ingresoModel: Model<Ingreso>,
    private readonly clienteGoogle: ClienteGoogle,
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

    await this.registrarIngreso(encontrado._id);
    const { clave: _clave, ...usuario } = encontrado;
    return { token: this.generarToken(usuario), usuario };
  }

  async google({ credencial }: GoogleDto) {
    if (!this.clienteGoogle.habilitado) {
      throw new NotFoundException({
        message: 'El ingreso con Google no está disponible',
        codigo: 'GOOGLE_NO_DISPONIBLE',
      });
    }
    const perfilGoogle = await this.clienteGoogle.verificar(credencial);
    if (!perfilGoogle) {
      this.logger.advertir(
        EVENTOS_DE_LOG.INGRESO_FALLIDO,
        'Ingreso con Google fallido: credencial inválida',
      );
      throw new UnauthorizedException({
        message: 'La credencial de Google no es válida',
        codigo: 'GOOGLE_CREDENCIAL_INVALIDA',
      });
    }
    if (!perfilGoogle.correoVerificado) {
      throw new UnauthorizedException({
        message: 'El correo de Google no está verificado',
        codigo: 'GOOGLE_CORREO_NO_VERIFICADO',
      });
    }

    let encontrado = await this.usuariosService.buscarParaGoogle(
      perfilGoogle.id,
      perfilGoogle.correo,
    );
    if (!encontrado) {
      encontrado = await this.crearCuentaDeGoogle(perfilGoogle);
    } else if (!encontrado.googleId) {
      await this.usuariosService.vincularGoogle(
        encontrado._id,
        perfilGoogle.id,
      );
      this.logger.info(
        EVENTOS_DE_LOG.CUENTA_GOOGLE_VINCULADA,
        'Cuenta existente vinculada con Google',
        { id_usuario: String(encontrado._id) },
      );
    }
    if (!encontrado.habilitado) {
      throw new ForbiddenException({
        message: 'Usuario deshabilitado',
        codigo: 'USUARIO_DESHABILITADO',
      });
    }
    this.logger.info(EVENTOS_DE_LOG.INGRESO_GOOGLE, 'Ingreso con Google', {
      id_usuario: String(encontrado._id),
      nombre_usuario: encontrado.nombreUsuario,
    });
    await this.registrarIngreso(encontrado._id);
    const { googleId: _googleId, ...usuario } = encontrado;
    return { token: this.generarToken(usuario), usuario };
  }

  private async crearCuentaDeGoogle(perfilGoogle: PerfilGoogle) {
    const perfil =
      perfilGoogle.correo === this.config.correoAdmin
        ? 'administrador'
        : 'usuario';
    const foto = await this.clienteGoogle.descargarFoto(perfilGoogle.foto);
    const creado = await this.usuariosService.crearDesdeGoogle(
      perfilGoogle,
      perfil,
      foto,
    );
    this.logger.info(
      EVENTOS_DE_LOG.CUENTA_GOOGLE_CREADA,
      'Cuenta creada con Google',
      {
        id_usuario: String(creado!._id),
        nombre_usuario: creado!.nombreUsuario,
      },
    );
    return { ...creado!, googleId: perfilGoogle.id };
  }

  async accesoDocente() {
    const correo = this.config.correoAccesoDocente;
    const encontrado = correo
      ? await this.usuariosService.buscarPorIdentificador(correo)
      : null;
    if (!encontrado?.habilitado || encontrado.perfil !== 'administrador') {
      throw new NotFoundException({
        message: 'El acceso docente no está disponible',
        codigo: 'ACCESO_DOCENTE_NO_DISPONIBLE',
      });
    }
    this.logger.info(EVENTOS_DE_LOG.ACCESO_DOCENTE, 'Acceso docente', {
      id_usuario: String(encontrado._id),
      nombre_usuario: encontrado.nombreUsuario,
    });
    await this.registrarIngreso(encontrado._id);
    const { clave: _clave, ...usuario } = encontrado;
    return { token: this.generarToken(usuario), usuario };
  }

  private async registrarIngreso(usuario: Types.ObjectId) {
    try {
      await this.ingresoModel.create({ usuario });
    } catch (error) {
      this.logger.advertir(
        EVENTOS_DE_LOG.INGRESO_NO_REGISTRADO,
        'No se pudo registrar el ingreso',
        { id_usuario: String(usuario), motivo: (error as Error).message },
      );
    }
  }

  verificarToken(token: string) {
    try {
      const payload = jwt.verify(token, this.config.secretoJwt, {
        algorithms: [ALGORITMO_JWT],
      }) as jwt.JwtPayload;
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
      { expiresIn: this.config.expiraJwt, algorithm: ALGORITMO_JWT },
    );
  }
}
