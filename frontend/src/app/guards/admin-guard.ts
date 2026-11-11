import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../servicios/auth/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.token()) {
    return router.parseUrl('/login');
  }
  return auth.usuario()?.perfil === 'administrador' ? true : router.parseUrl('/publicaciones');
};
