import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ETIQUETAS } from './etiquetas-swagger.js';

export const RUTA_DE_DOCUMENTACION = 'docs';

export function crearDocumento(app: INestApplication) {
  const configuracion = new DocumentBuilder()
    .setTitle('Banquete API')
    .setDescription(
      'API de la red social Banquete. Los errores responden { message, codigo }.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  configuracion.tags = Object.values(ETIQUETAS).map(
    ({ nombre, descripcion }) => ({ name: nombre, description: descripcion }),
  );
  return SwaggerModule.createDocument(app, configuracion);
}

export function configurarSwagger(app: INestApplication) {
  SwaggerModule.setup(RUTA_DE_DOCUMENTACION, app, crearDocumento(app));
}
