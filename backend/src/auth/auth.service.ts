import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { IngresarDto } from './dto/ingresar.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usuariosService: UsuariosService,
    private readonly imagenesService: ImagenesService,
  ) {}

  async registro(dto: RegistroDto, imagen?: Express.Multer.File) {
    const fechaNacimiento = new Date(dto.fechaNacimiento);
    if (fechaNacimiento > new Date()) {
      throw new BadRequestException(
        'fechaNacimiento no puede ser una fecha futura',
      );
    }

    const adminEmail = this.config.get<string>('ADMIN_EMAIL')?.toLowerCase();
    const perfil =
      dto.correo.toLowerCase() === adminEmail ? 'administrador' : 'usuario';
    const clave = await bcrypt.hash(dto.clave, 10);
    const imagenGuardada = imagen
      ? await this.imagenesService.guardar(imagen)
      : undefined;

    try {
      const usuario = await this.usuariosService.crear({
        ...dto,
        clave,
        fechaNacimiento,
        perfil,
        imagenPerfil: imagenGuardada?.url,
      });
      this.logger.log(`Usuario registrado: ${usuario!._id} (${perfil})`);
      return { token: this.generarToken(usuario!), usuario };
    } catch (error) {
      if (imagenGuardada) {
        this.logger.warn(
          `Registro fallido: se borra la imagen ${imagenGuardada.id}`,
        );
        await this.imagenesService.borrar(imagenGuardada.id);
      }
      throw error;
    }
  }

  async ingresar(dto: IngresarDto) {
    const encontrado = await this.usuariosService.buscarPorIdentificador(
      dto.identificador,
    );
    const coincide =
      encontrado && (await bcrypt.compare(dto.clave, encontrado.clave));
    if (!encontrado || !coincide) {
      this.logger.warn('Ingreso fallido: credenciales inválidas');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.logger.log(`Ingreso correcto: ${encontrado._id}`);

    const { clave: _clave, ...usuario } = encontrado;
    return { token: this.generarToken(usuario), usuario };
  }

  verificarToken(token: string) {
    try {
      const payload = jwt.verify(
        token,
        this.config.getOrThrow<string>('JWT_SECRET'),
      ) as jwt.JwtPayload;
      return { id: payload.sub as string, perfil: payload.perfil as string };
    } catch (error) {
      this.logger.warn(`Token rechazado: ${(error as Error).message}`);
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }

  private generarToken(usuario: { _id: unknown; perfil: string }) {
    return jwt.sign(
      { sub: String(usuario._id), perfil: usuario.perfil },
      this.config.getOrThrow<string>('JWT_SECRET'),
      { expiresIn: '15m' },
    );
  }
}
