import jwt from 'jsonwebtoken';

export function tokenDeAdministrador(usuarioId: string) {
  return jwt.sign(
    { sub: usuarioId, perfil: 'administrador' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' },
  );
}
