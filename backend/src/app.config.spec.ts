import { appConfig } from './app.config.js';

describe('appConfig', () => {
  beforeEach(() => {
    vi.stubEnv('MONGO_URI', 'mongodb://prueba/base');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[O] sin PORT ni FRONTEND_URL usa los valores por defecto', () => {
    vi.stubEnv('PORT', '');
    vi.stubEnv('FRONTEND_URL', '');
    delete process.env.PORT;
    delete process.env.FRONTEND_URL;

    expect(appConfig()).toEqual({
      puerto: 3000,
      urlFrontend: 'http://localhost:4200',
      uriMongo: 'mongodb://prueba/base',
    });
  });

  it('[O] con PORT y FRONTEND_URL usa los del entorno', () => {
    vi.stubEnv('PORT', '3001');
    vi.stubEnv('FRONTEND_URL', 'https://banquete.vercel.app');

    expect(appConfig()).toMatchObject({
      puerto: 3001,
      urlFrontend: 'https://banquete.vercel.app',
    });
  });

  it('[E] sin MONGO_URI no arranca', () => {
    vi.stubEnv('MONGO_URI', '');

    expect(() => appConfig()).toThrow('MONGO_URI');
  });
});
