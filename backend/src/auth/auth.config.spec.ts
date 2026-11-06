import { authConfig } from './auth.config.js';

describe('authConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[O] lee el secreto y pasa el correo del administrador a minúsculas', () => {
    vi.stubEnv('JWT_SECRET', 'secreto');
    vi.stubEnv('ADMIN_EMAIL', 'Admin@Correo.com');

    expect(authConfig()).toEqual({
      secretoJwt: 'secreto',
      expiraJwt: '15m',
      duracionMaximaSesionSegundos: 43200,
      rondasBcrypt: 10,
      correoAdmin: 'admin@correo.com',
    });
  });

  it('[B] sin ADMIN_EMAIL no hay administrador', () => {
    vi.stubEnv('JWT_SECRET', 'secreto');
    vi.stubEnv('ADMIN_EMAIL', '');

    expect(authConfig().correoAdmin).toBe('');
  });

  it('[E] sin JWT_SECRET no arranca', () => {
    vi.stubEnv('JWT_SECRET', '');

    expect(() => authConfig()).toThrow('JWT_SECRET');
  });
});
