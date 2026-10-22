import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Auth } from '../servicios/auth/auth';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Auth).token();
  if (!token || !req.url.startsWith(environment.API_URL)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
