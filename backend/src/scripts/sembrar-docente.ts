import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { datosDeLaCuentaDocente } from '../usuarios/cuenta-docente.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

const mensajeDe = (error: unknown) =>
  (error as { response?: { message?: string } }).response?.message ??
  (error as Error).message;

try {
  const datos = datosDeLaCuentaDocente();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const { accion } = await app
      .get(UsuariosService)
      .asegurarCuentaDeAdministrador(datos);
    console.log(
      `Cuenta docente ${accion}: ${datos.correo} (usuario «${datos.nombreUsuario}», perfil administrador).`,
    );
    console.log(
      process.env.DOCENTE_CLAVE
        ? 'La clave es la que se indicó en DOCENTE_CLAVE.'
        : `Clave generada (se muestra una sola vez): ${datos.clave}`,
    );
    console.log(
      `Para activar el botón del sombrerito, definí ACCESO_DOCENTE_CORREO=${datos.correo} en el servidor.`,
    );
  } finally {
    await app.close();
  }
} catch (error) {
  console.error(`No se pudo sembrar la cuenta docente: ${mensajeDe(error)}`);
  process.exitCode = 1;
}
