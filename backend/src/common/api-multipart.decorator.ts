import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

const ARCHIVO = { type: 'string', format: 'binary' } as const;

export const UNA_IMAGEN = { imagen: ARCHIVO };

export const IMAGEN_Y_FOTOS_DE_PASOS = {
  imagen: ARCHIVO,
  imagenesPasos: { type: 'array', items: ARCHIVO },
};

export function ApiMultipart(
  archivos: Record<string, object>,
  dto?: Type<unknown>,
) {
  const parteDeArchivos = { type: 'object', properties: archivos };
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ...(dto
      ? [
          ApiExtraModels(dto),
          ApiBody({
            schema: {
              allOf: [{ $ref: getSchemaPath(dto) }, parteDeArchivos],
            },
          }),
        ]
      : [ApiBody({ schema: parteDeArchivos })]),
  );
}
