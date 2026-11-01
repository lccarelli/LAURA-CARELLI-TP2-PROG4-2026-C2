import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: {
      MONGO_URI:
        'mongodb://prog4:prog4@localhost:27017/redsocial_test?authSource=admin',
      JWT_SECRET: 'secreto-de-pruebas',
      ADMIN_EMAIL: 'admin@prueba.com',
      CLOUDINARY_API_KEY: 'clave-de-pruebas',
      CLOUDINARY_API_SECRET: 'secreto-de-pruebas',
      CLOUDINARY_CLOUD_NAME: 'nube-de-pruebas',
    },
  },
});
