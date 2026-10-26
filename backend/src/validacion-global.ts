import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

function mensajesDe(errores: ValidationError[]): string[] {
  return errores.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...mensajesDe(error.children ?? []),
  ]);
}

export function aplicarValidacionGlobal(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errores) =>
        new BadRequestException({
          message: mensajesDe(errores),
          codigo: 'DATOS_INVALIDOS',
        }),
    }),
  );
}
