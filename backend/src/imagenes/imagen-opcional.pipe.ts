import {
  BadRequestException,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';

export const imagenOpcional = () =>
  new ParseFilePipe({
    fileIsRequired: false,
    exceptionFactory: (mensaje) =>
      new BadRequestException({
        message: mensaje,
        codigo: 'IMAGEN_TIPO_INVALIDO',
      }),
    validators: [
      new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
    ],
  });
