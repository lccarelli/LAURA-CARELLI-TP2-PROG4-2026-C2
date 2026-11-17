import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../servicios/auth/auth';

export const publicoGuard: CanActivateFn = (ruta) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth.token() ? router.parseUrl(`/publicaciones/${ruta.paramMap.get('id')}`) : true;
};
