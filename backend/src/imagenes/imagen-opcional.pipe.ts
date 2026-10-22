import { FileTypeValidator, ParseFilePipe } from '@nestjs/common';

export const imagenOpcional = () =>
  new ParseFilePipe({
    fileIsRequired: false,
    validators: [
      new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
    ],
  });
