import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Ingreso, IngresoSchema } from './schemas/ingreso.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ingreso.name, schema: IngresoSchema }]),
    forwardRef(() => UsuariosModule),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
