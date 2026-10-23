import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ImagenesService } from '../imagenes/imagenes.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
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

  private generarToken(usuario: { _id: unknown; perfil: string }) {
    return jwt.sign(
      { sub: String(usuario._id), perfil: usuario.perfil },
      this.config.getOrThrow<string>('JWT_SECRET'),
      { expiresIn: '15m' },
    );
  }
}
