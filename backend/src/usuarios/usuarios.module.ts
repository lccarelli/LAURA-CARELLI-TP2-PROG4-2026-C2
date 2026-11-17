import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema.js';
import { PerfilAjenoController } from './perfil-ajeno.controller.js';
import { PerfilController } from './perfil.controller.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => ImagenesModule),
  ],
  controllers: [UsuariosController, PerfilController, PerfilAjenoController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
