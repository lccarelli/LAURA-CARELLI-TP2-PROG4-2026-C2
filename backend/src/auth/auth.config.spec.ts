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

  it('[O] JWT_EXPIRA cambia la duración del token', () => {
    vi.stubEnv('JWT_SECRET', 'secreto');
    vi.stubEnv('JWT_EXPIRA', '2m');

    expect(authConfig().expiraJwt).toBe('2m');
  });

  it('[B] JWT_EXPIRA vacía usa 15 minutos', () => {
    vi.stubEnv('JWT_SECRET', 'secreto');
    vi.stubEnv('JWT_EXPIRA', '');

    expect(authConfig().expiraJwt).toBe('15m');
  });

  it.each(['2', 'm', '0m', '-5m', '1.5m', '2 m', '2d', 'dos minutos'])(
    '[E] JWT_EXPIRA «%s» no arranca',
    (valor) => {
      vi.stubEnv('JWT_SECRET', 'secreto');
      vi.stubEnv('JWT_EXPIRA', valor);

      expect(() => authConfig()).toThrow('JWT_EXPIRA');
    },
  );

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
