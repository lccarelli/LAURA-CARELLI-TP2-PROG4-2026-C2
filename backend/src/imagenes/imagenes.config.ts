import { registerAs } from '@nestjs/config';
import { variableRequerida } from '../common/variable-requerida.js';

export const imagenesConfig = registerAs('imagenes', () => ({
  apiKey: variableRequerida('CLOUDINARY_API_KEY'),
  apiSecret: variableRequerida('CLOUDINARY_API_SECRET'),
  cloudName: variableRequerida('CLOUDINARY_CLOUD_NAME'),
  carpeta: process.env.CLOUDINARY_CARPETA || 'banquete',
}));
