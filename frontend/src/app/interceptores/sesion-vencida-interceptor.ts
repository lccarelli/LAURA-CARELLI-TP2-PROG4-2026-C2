import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from '../servicios/auth/auth';
import { mensajeDeApi } from '../utilidades/errores';

const RUTAS_DE_SESION = ['/auth/ingresar', '/auth/registro', '/auth/refrescar'];

export const sesionVencidaInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const esPedidoALaApi = req.url.startsWith(environment.API_URL);
      const esRutaDeSesion = RUTAS_DE_SESION.some((ruta) => req.url.endsWith(ruta));
      const conElTokenVigente = req.headers.get('Authorization') === `Bearer ${auth.token()}`;

      if (error.status === 401 && esPedidoALaApi && !esRutaDeSesion && conElTokenVigente) {
        const motivo = mensajeDeApi(error);
        auth.salir(motivo.startsWith('api.') ? motivo : 'api.TOKEN_INVALIDO');
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
