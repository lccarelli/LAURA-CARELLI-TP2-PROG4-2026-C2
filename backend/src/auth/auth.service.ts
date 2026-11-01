import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { Destino } from '../imagenes/destinos.js';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { authConfig } from './auth.config.js';
import { IngresarDto } from './dto/ingresar.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly usuariosService: UsuariosService,
    private readonly imagenesService: ImagenesService,
  ) {}

  async registro(dto: RegistroDto, imagen?: Express.Multer.File) {
    const fechaNacimiento = new Date(dto.fechaNacimiento);
    if (fechaNacimiento > new Date()) {
      throw new BadRequestException({
        message: 'fechaNacimiento no puede ser una fecha futura',
        codigo: 'FECHA_FUTURA',
      });
    }

    const perfil =
      dto.correo.toLowerCase() === this.config.correoAdmin
        ? 'administrador'
        : 'usuario';
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

    const usuario = await this.usuariosService.crear({
      ...dto,
      _id: usuarioId,
      clave,
      fechaNacimiento,
      perfil,
      imagenPerfil,
    });
    this.logger.log(`Usuario registrado: ${usuario!._id} (${perfil})`);
    return { token: this.generarToken(usuario!), usuario };
  }

  async ingresar(dto: IngresarDto) {
    const encontrado = await this.usuariosService.buscarPorIdentificador(
      dto.identificador,
    );
    const coincide =
      encontrado && (await bcrypt.compare(dto.clave, encontrado.clave));
    if (!encontrado || !coincide) {
      this.logger.warn('Ingreso fallido: credenciales inválidas');
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        codigo: 'CREDENCIALES_INVALIDAS',
      });
    }

    this.logger.log(`Ingreso correcto: ${encontrado._id}`);

    const { clave: _clave, ...usuario } = encontrado;
    return { token: this.generarToken(usuario), usuario };
  }

  verificarToken(token: string) {
    try {
      const payload = jwt.verify(
        token,
        this.config.secretoJwt,
      ) as jwt.JwtPayload;
      return { id: payload.sub as string, perfil: payload.perfil as string };
    } catch (error) {
      this.logger.warn(`Token rechazado: ${(error as Error).message}`);
      throw new UnauthorizedException({
        message: 'Token inválido o vencido',
        codigo: 'TOKEN_INVALIDO',
      });
    }
  }

  private generarToken(usuario: { _id: unknown; perfil: string }) {
    return jwt.sign(
      { sub: String(usuario._id), perfil: usuario.perfil },
      this.config.secretoJwt,
      { expiresIn: this.config.expiraJwt },
    );
  }
}
