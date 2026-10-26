import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario } from './schemas/usuario.schema.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
  ) {}

  async crear(datos: Partial<Usuario>) {
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
}
